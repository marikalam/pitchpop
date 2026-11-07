import { useEffect, useRef, useState } from "react";
import { playCorrectChime, playWrongBuzz } from "./piano.js";
import { prewarmVoices, speakColorName, speakWords } from "./speech.js";
import { isCurrent, later, newSound } from "./soundBus.js";
import Icon from "./Icon.jsx";
import { colorLabel, t } from "./i18n.js";
import Rainbow from "./Rainbow.jsx";
import { SpeakerIcon } from "./icons.jsx";

// Twin practice (Today's practice): the two colors this player mixes up
// most this week (progress.js), on their own. Many mix-ups are "twins":
// the same chord shape one step apart (Black A-C-F and Blue B-D-G), so
// only the pitch tells them apart.
//  1. Listen: the two chords play back to back, three times each, each
//     card lighting up as its chord plays.
//  2. Then chords of just these two, and the player picks the color, the
//     Eguchi way (chord first, then color), until GOAL right in a row. A
//     miss starts the row again and plays both, one after the other, so
//     the difference is heard. It stops after MAX_CHORDS at most.
const GOAL = 10;
const MAX_CHORDS = 40;
// Twins (same shape, one step apart), in this order.
const TWINS = [
  ["black", "blue"],
  ["yellow", "green"],
  ["purple", "pink"],
];
const CHORD_MS = 2200;
const LISTEN_TIMES = 3;

const cap = (n) => colorLabel(n);

// The next chord: either one, but never three of the same in a row.
function nextName(history, a, b) {
  const [x, y] = history.slice(-2);
  if (x && x === y) return x === a ? b : a;
  return Math.random() < 0.5 ? a : b;
}

// pair: the two color objects ({ name, hex, text, notes }).
export default function TwinPractice({
  engine,
  pair,
  rainbowColors = [],
  onComplete,
  stickerSlot,
  // Part 2 of Pitch Practice (App.jsx): `part` labels the screens, and
  // `onFinish` gets the result instead of this screen's own "done" page
  // (the round's results show both parts).
  part = null,
  onFinish = null,
}) {
  const twin = TWINS.find(
    ([one, two]) =>
      pair.some((c) => c.name === one) && pair.some((c) => c.name === two),
  );
  const [a, b] = twin ? twin.map((n) => pair.find((c) => c.name === n)) : pair;
  const [stage, setStage] = useState("meet"); // meet | play | done
  const [lit, setLit] = useState(null); // the card lit while its chord plays
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState(() => [nextName([], a.name, b.name)]);
  const [answered, setAnswered] = useState(null); // { name, correct }
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const index = history.length - 1;
  const color = history[index] === a.name ? a : b;
  const other = color === a ? b : a;
  const finished = useRef(false);
  const won = streak >= GOAL;

  useEffect(() => {
    prewarmVoices();
    [a, b].forEach((c) => engine.getChordBuffer(c.notes));
    return () => newSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playChord = (c) => engine.playChord(c.notes);
  function hear(c) {
    newSound();
    setListening(false);
    setLit(c.name);
    playChord(c);
    later(() => setLit(null), CHORD_MS);
  }

  // 1. Back to back: A, B, A, B, A, B, each card lit as it plays.
  function listenBoth() {
    const id = newSound();
    setListening(true);
    const order = Array.from({ length: LISTEN_TIMES * 2 }, (_, i) =>
      i % 2 ? b : a,
    );
    order.forEach((c, i) =>
      later(
        () => {
          if (!isCurrent(id)) return;
          setLit(c.name);
          playChord(c);
        },
        300 + i * CHORD_MS,
      ),
    );
    later(
      () => {
        setLit(null);
        setListening(false);
      },
      300 + order.length * CHORD_MS,
    );
  }
  useEffect(() => {
    if (stage !== "meet") return undefined;
    const id = setTimeout(listenBoth, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // 2. Each new chord plays by itself.
  useEffect(() => {
    if (stage !== "play") return undefined;
    const id = setTimeout(() => {
      newSound();
      playChord(color);
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, history.length]);

  // Moves on by itself (or at once with Next).
  const nextRef = useRef(null);
  nextRef.current = next;
  const indexRef = useRef(index);
  indexRef.current = index;

  function answer(name) {
    if (answered) return;
    const correct = name === color.name;
    setAnswered({ name, correct });
    const id = newSound();
    const at = index;
    if (correct) {
      playCorrectChime();
      setCorrectCount((n) => n + 1);
      setStreak((s) => {
        setBest((x) => Math.max(x, s + 1));
        return s + 1;
      });
      later(async () => {
        await speakColorName(color.name);
        if (isCurrent(id)) playChord(color);
      }, 400);
    } else {
      // The row starts again. Its name and chord, then the other's, to
      // hear the difference.
      setStreak(0);
      playWrongBuzz();
      later(async () => {
        await speakColorName(color.name);
        if (!isCurrent(id)) return;
        playChord(color);
        later(async () => {
          await speakColorName(other.name);
          if (isCurrent(id)) playChord(other);
        }, CHORD_MS);
      }, 400);
    }
    setTimeout(
      () => {
        if (indexRef.current === at && !finished.current) nextRef.current();
      },
      correct ? 4000 : 8500,
    );
  }

  function next() {
    if (finished.current) return;
    newSound();
    if (won || history.length >= MAX_CHORDS) {
      finished.current = true;
      setStage("done");
      speakWords(
        won
          ? `${GOAL} in a row! Great listening!`
          : "Great work! Try again tomorrow.",
      );
      onComplete?.(correctCount, history.length);
      onFinish?.({ correct: correctCount, total: history.length, best, won, pair: [a.name, b.name] });
      return;
    }
    setHistory((h) => [...h, nextName(h, a.name, b.name)]);
    setAnswered(null);
  }

  function restart() {
    finished.current = false;
    setHistory([nextName([], a.name, b.name)]);
    setAnswered(null);
    setStreak(0);
    setBest(0);
    setCorrectCount(0);
    setStage("meet");
  }

  const button = (c, onClick, extra = "", disabled = false) => (
    <button
      key={c.name}
      className={`option-btn sn-color twin-color${lit === c.name ? " twin-color-lit" : ""}${extra}`}
      style={{ background: c.hex, color: c.text }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="twin-color-name">{cap(c.name)}</span>
      <span className="twin-color-notes">{c.notes.join(" - ")}</span>
    </button>
  );

  // The row so far: GOAL stars, one lit for each right answer in a row.
  const stars = (
    <div
      className="twin-stars"
      aria-label={`${Math.min(streak, GOAL)} of ${GOAL} in a row`}
    >
      {Array.from({ length: GOAL }, (_, i) => (
        <span
          key={i}
          className={`twin-star${i < streak ? " twin-star-on" : ""}`}
        >
          <Icon name="star" />
        </span>
      ))}
    </div>
  );

  if (stage === "meet") {
    return (
      <div className="ns-screen sn-screen twin-screen">
        <span className="sn-part">{part ? `${t(part)} · ${t("Twin practice")}` : t("Twin practice")}</span>
        <h2 className="screen-title ns-title">
          {cap(a.name)} or {cap(b.name)}?
        </h2>
        <p className="screen-sub twin-sub">
          {listening
            ? t("Listen to both, one after the other…")
            : t("These two get mixed up most this week. Tap each one to hear it again.")}
        </p>
        <div className="sn-colors sn-colors-2 twin-meet">
          {button(a, () => hear(a))}
          {button(b, () => hear(b))}
        </div>
        <button
          className="pill-btn-secondary pill-btn-full twin-again"
          onClick={listenBoth}
          disabled={listening}
        >
          <Icon name="speaker" /> {t("Hear both again")}
        </button>
        <button
          className="pill-btn-primary pill-btn-full twin-start"
          onClick={() => {
            newSound();
            setLit(null);
            setListening(false);
            setStage("play");
          }}
        >
          {t("Start: get {n} in a row", { n: GOAL })} →
        </button>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="complete-wrap">
        <div className="complete-emoji">
          <Icon name={won ? "star" : "target"} />
        </div>
        <h2 className="screen-title">
          {won ? t("{n} in a row!", { n: GOAL }) : t("Twin practice done!")}
        </h2>
        <p className="screen-sub">
          {won
            ? t("{a} and {b}: {right} of {total} right.", { a: cap(a.name), b: cap(b.name), right: correctCount, total: history.length })
            : t("Best: {best} in a row. {a} and {b} again tomorrow!", { best, a: cap(a.name), b: cap(b.name) })}
        </p>
        {(stickerSlot || ((then) => then))(
          <button className="pill-btn-primary" onClick={restart}>
            {t("Play again")} →
          </button>,
        )}
      </div>
    );
  }

  return (
    <div className="ns-screen sn-screen twin-screen">
      {stars}
      <span className="sn-part">
        {part ? `${t(part)} · ` : ""}{t("Twin practice · get {n} in a row", { n: GOAL })}
      </span>
      <h2 className="screen-title ns-title">{t("Which color is this chord?")}</h2>
      <button
        className={`rainbow-play-wrap rainbow-play-wrap-compact sn-rainbow${
          answered
            ? answered.correct
              ? " sn-listen-right"
              : " sn-listen-wrong"
            : ""
        }`}
        onClick={() => {
          newSound();
          playChord(color);
        }}
        aria-label="Hear the chord again"
      >
        <Rainbow colors={rainbowColors} activeName={null} visible pretty />
        <span className="rainbow-center-btn">
          <SpeakerIcon />
        </span>
      </button>
      <div className="ns-answer">
        <p
          className={`note-feedback-text ns-key-prompt${answered ? (answered.correct ? " note-feedback-correct" : "") : " ns-key-prompt-ask"}`}
          aria-live="polite"
        >
          {answered
            ? answered.correct
              ? won
                ? t("{n} in a row! That's {color}.", { n: GOAL, color: cap(color.name) })
                : t("Yes! That's {name}.", { name: cap(color.name) })
              : t("That's {right}. Now hear {other}…", { right: cap(color.name), other: cap(other.name) })
            : t("Listen, count 1, 2, then pick")}
        </p>
        <div className="sn-colors sn-colors-2">
          {[a, b].map((c) => {
            const right = answered && c.name === color.name;
            const wrong =
              answered && !answered.correct && c.name === answered.name;
            return button(
              c,
              () => answer(c.name),
              `${right ? " sn-color-right" : ""}${wrong ? " sn-color-wrong" : ""}${answered && !right && !wrong ? " sn-color-dim" : ""}`,
              !!answered,
            );
          })}
        </div>
        {answered && (
          <button className="pill-btn-primary ns-next" onClick={next}>
            {t(won ? "Finish" : "Next")} →
          </button>
        )}
      </div>
    </div>
  );
}

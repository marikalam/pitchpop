import { useEffect, useRef, useState } from 'react';
import { colorLabel, noteText, t } from './i18n.js';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { speakNoteName, speakResults } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';
import { buildNoteQueue, lettersFor, readingClef, readingLetters, readingLevel } from './noteReading.js';
import ProgressDots from './ProgressDots.jsx';
import Staff from './Staff.jsx';
import { recordNoteRound } from './todayPlan.js';
import Icon from './Icon.jsx';
import Melo from './Melo.jsx';
import MeloClimb, { CROWN_AT, CrownIcon, pointsFor } from './MeloClimb.jsx';
import { closetFor } from './meloCloset.js';

// Note reading: a note is drawn on a treble or bass staff, the player
// names it, and the app says the name and plays that exact pitch - so
// every answer, right or wrong, links the written note to its name and
// its sound.
const SESSION_ROUNDS = 20;
// The answer is a key on a piano from C up to the G above the next C (on
// the treble staff: middle C up to the G above the top line), with the
// letter on each key; any key with the right letter answers it. Letters a
// player isn't reading yet are dimmed; the black keys are only there to
// look like a piano.
const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
const BLACK_AFTER = ['C', 'D', 'F', 'G', 'A'];
// Melo's Climb: bonus points for winning the crown (10 in a row).
const CROWN_BONUS = 100;
// A "speedy" right answer: within this long of the note appearing.
const SPEEDY_MS = 3000;
const SPEEDY_BADGE = 10;
const BEST_KEY = 'pitchpop-notespeller-best-v1';
function loadBest(playerId) {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY))?.[playerId] || 0;
  } catch {
    return 0;
  }
}
function saveBest(playerId, score) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY)) || {};
    localStorage.setItem(BEST_KEY, JSON.stringify({ ...all, [playerId]: score }));
  } catch {
    /* ignore */
  }
}
// Stars for a round of 20: 18+ right is three, 14+ two, 8+ one.
const starsFor = (right) => (right >= 18 ? 3 : right >= 14 ? 2 : right >= 8 ? 1 : 0);
function Star({ on }) {
  return (
    <svg className={`ns-star${on ? ' ns-star-on' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z" fill="currentColor" />
    </svg>
  );
}
export default function NoteSpeller({ engine, playerId, onComplete, stickerSlot }) {
  // Clef (treble, bass or both), part of the staff and letters are set per
  // player in Players & colors.
  const [{ clefMode, level, myLetters }] = useState(() => ({
    clefMode: readingClef(playerId),
    level: readingLevel(playerId),
    myLetters: readingLetters(playerId),
  }));
  const [queue, setQueue] = useState(() => buildNoteQueue(clefMode, SESSION_ROUNDS, level, myLetters));
  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Right or wrong for each note answered ({ [index]: true | false }).
  const [outcomes, setOutcomes] = useState({});
  const [done, setDone] = useState(false);
  // Letters missed this round, for tomorrow's "Today's practice".
  const misses = useRef({});
  // Melo's Climb: right in a row, the round's best run, points, the crown.
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [gained, setGained] = useState(0);
  const [crowned, setCrowned] = useState(false);
  const [crownShow, setCrownShow] = useState(false);
  // How each letter went this round ({ C: { right, total } }), and how
  // many were read right quickly.
  const [byLetter, setByLetter] = useState({});
  const [speedy, setSpeedy] = useState(0);
  const shownAt = useRef(Date.now());
  const [best, setBest] = useState(() => loadBest(playerId));
  const [newBest, setNewBest] = useState(false);
  const [wear] = useState(() => closetFor(playerId).wear || {});
  useEffect(() => {
    shownAt.current = Date.now();
  }, [roundIndex, queue]);
  // The crown card goes away by itself (or with a tap).
  useEffect(() => {
    if (!crownShow) return undefined;
    const id = setTimeout(() => setCrownShow(false), 3500);
    return () => clearTimeout(id);
  }, [crownShow]);

  const target = queue[roundIndex];

  // Render this round's pitches ahead of time (offline rendering needs no
  // tap), so the reveal plays instantly.
  useEffect(() => {
    queue.forEach((n) => engine.getPitchBuffer(n.letter, n.octave));
  }, [queue, engine]);

  function restart() {
    finishedRef.current = false;
    setQueue(buildNoteQueue(clefMode, SESSION_ROUNDS, level, myLetters));
    setRoundIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setOutcomes({});
    setDone(false);
    misses.current = {};
    setStreak(0);
    setScore(0);
    setGained(0);
    setCrowned(false);
    setCrownShow(false);
    setByLetter({});
    setSpeedy(0);
    setNewBest(false);
  }

  function hearNote() {
    newSound();
    engine.playPitch(target.letter, target.octave);
  }

  // Says the letter, then plays the note - unless another sound has started
  // meanwhile (see soundBus.js).
  async function sayAndPlay(note, soundId = newSound()) {
    await speakNoteName(note.letter);
    if (!isCurrent(soundId)) return;
    engine.playPitch(note.letter, note.octave);
  }

  // key: which of the keys was tapped (some letters are there twice).
  function answer(letter, key) {
    if (answered) return;
    const correct = letter === target.letter;
    setAnswered({ picked: letter, key, correct });
    setOutcomes((o) => ({ ...o, [roundIndex]: correct }));
    const soundId = newSound();
    setByLetter((b) => {
      const was = b[target.letter] || { right: 0, total: 0 };
      return { ...b, [target.letter]: { right: was.right + (correct ? 1 : 0), total: was.total + 1 } };
    });
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
      // Melo goes up a step for every right note (a miss doesn't send Melo
      // back down); the tenth wins the crown. In a row, the points grow.
      const run = streak + 1;
      const crownNow = correctCount + 1 === CROWN_AT && !crowned;
      const points = pointsFor(run) + (crownNow ? CROWN_BONUS : 0);
      setStreak(run);
      setScore((x) => x + points);
      setGained(points);
      if (crownNow) {
        setCrowned(true);
        setCrownShow(true);
      }
      if (Date.now() - shownAt.current <= SPEEDY_MS) setSpeedy((n) => n + 1);
    } else {
      playWrongBuzz();
      misses.current[target.letter] = (misses.current[target.letter] || 0) + 1;
      // The points' streak starts again; Melo stays on the step.
      setStreak(0);
      setGained(0);
    }
    // Say the name and play the note, then on to the next note by itself
    // (a wrong answer stays up a little longer, to see the right one).
    // It moves on even if the sound never finishes (the phone's sound
    // paused, or the voice slow to load), so the screen can't get stuck.
    // Tapping to hear it again (a new sound) doesn't stop it moving on:
    // it's tied to this question, not to the sound. Next does it at once.
    const at = roundIndex;
    let moved = false;
    const moveOn = () => {
      if (moved || finishedRef.current || roundRef.current !== at || answeredAtRef.current !== at) return;
      moved = true;
      nextRef.current();
    };
    setTimeout(moveOn, correct ? 4000 : 5000);
    later(async () => {
      await sayAndPlay(target, soundId);
      if (isCurrent(soundId)) later(moveOn, correct ? 900 : 1800);
    }, 350);
  }

  // next() as of the latest render (it reads this round's state), for
  // the timer that moves on by itself.
  const nextRef = useRef(null);
  nextRef.current = next;
  // The question on screen, and the one answered (for moving on by itself).
  const roundRef = useRef(roundIndex);
  roundRef.current = roundIndex;
  const answeredAtRef = useRef(null);
  answeredAtRef.current = answered ? roundIndex : null;
  // Set once the last question is done, so it finishes only once.
  const finishedRef = useRef(false);

  function next() {
    if (finishedRef.current) return;
    newSound();
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      finishedRef.current = true;
      setDone(true);
      setCrownShow(false);
      if (score > best) {
        setNewBest(best > 0);
        setBest(score);
        saveBest(playerId, score);
      }
      speakResults(correctCount, SESSION_ROUNDS);
      recordNoteRound(playerId, misses.current);
      onComplete?.(correctCount, SESSION_ROUNDS);
      return;
    }
    setRoundIndex((i) => i + 1);
    setAnswered(null);
  }

  if (done) {
    const stars = starsFor(correctCount);
    const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].filter((l) => byLetter[l]);
    const practice = letters.filter((l) => byLetter[l].right < byLetter[l].total);
    const badges = [
      crowned && { id: 'crown', icon: <CrownIcon size={34} />, title: t('Crown climber'), sub: t('{n} notes right', { n: CROWN_AT }) },
      speedy >= SPEEDY_BADGE && { id: 'speedy', icon: (
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
            <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#fff" />
          </svg>
        ), title: t('Speedy Reader'), sub: t('{n} notes read in under 3 seconds', { n: speedy }) },
      correctCount === SESSION_ROUNDS && { id: 'perfect', icon: <Icon name="star" />, title: t('Perfect round'), sub: t('Every note right!') },
    ].filter(Boolean);
    return (
      <div className="ns-results">
        <div className="ns-results-melo">
          <Melo size={96} mood="cheer" wear={crowned ? { ...wear, hat: 'crown' } : wear} />
        </div>
        <div className="ns-stars" aria-label={`${stars} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <Star key={i} on={i < stars} />
          ))}
        </div>
        <h2 className="screen-title">{t('{right} of {total} right!', { right: correctCount, total: SESSION_ROUNDS })}</h2>
        <p className="screen-sub">
          {t('Score {score}', { score })} · {newBest ? <b className="ns-new-best">{t('New best!')}</b> : t('Best: {best}', { best })}
        </p>
        {badges.map((b) => (
          <div key={b.id} className={`ns-badge ns-badge-${b.id}`}>
            <span className="ns-badge-icon">{b.icon}</span>
            <span>
              <strong>{b.title}</strong>
              <small>{b.sub}</small>
            </span>
          </div>
        ))}
        {letters.length > 0 && (
          <div className="ns-letters">
            <strong>{t('Your notes')}</strong>
            <div className="ns-letter-row">
              {letters.map((l) => (
                <span key={l} className={`ns-letter ns-key-${l}`}>
                  <b>{noteText(l)}</b>
                  <small>
                    {byLetter[l].right}/{byLetter[l].total}
                  </small>
                </span>
              ))}
            </div>
            {practice.length > 0 && (
              <small className="ns-practice">{t('Keep practicing: {notes}', { notes: practice.map((l) => noteText(l)).join(', ') })}</small>
            )}
          </div>
        )}
        {/* Play again only once the sticker is in. */}
        {(stickerSlot || ((then) => then))(
          <button className="pill-btn-primary" onClick={restart}>
            {t('Play again')} →
          </button>,
        )}
      </div>
    );
  }

  // Everything fits on one screen, no scrolling: the staff takes whatever
  // height is left. Once a note is answered the right key lights up green
  // (a wrong one pink), and the next note comes by itself.
  return (
    <div className="ns-screen">
      <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} outcomes={outcomes} />
      <MeloClimb steps={correctCount} streak={streak} crowned={crowned} wear={wear} />
      <div className="ns-title-row">
        <h2 className="screen-title ns-title">
          {t('What note is this?')} <Icon name="notes" />
        </h2>
        <span className="ns-score" aria-label={t('Score {score}', { score })}>
          <Star on /> {score}
        </span>
      </div>
      <div
        className={`staff-card ns-staff-card${answered ? (answered.correct ? ' ns-staff-right' : ' ns-staff-wrong') : ''}`}
        // Tap anywhere on the staff to hear the note.
        role="button"
        tabIndex={0}
        aria-label="Hear the note"
        onClick={hearNote}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && hearNote()}
      >
        <span className="ns-deco ns-deco-1" aria-hidden="true">
          ♪
        </span>
        <span className="ns-deco ns-deco-2" aria-hidden="true">
          ♫
        </span>
        <span className="ns-deco ns-deco-3" aria-hidden="true">
          ♩
        </span>
        <Staff note={target} highlight={answered ? (answered.correct ? 'correct' : 'wrong') : null} />
        {answered?.correct && gained > 0 && (
          <span className="ns-gain" key={roundIndex} aria-hidden="true">
            +{gained}
          </span>
        )}
        <span className="ns-tap-hint" aria-hidden="true">
          <Icon name="speaker" /> Tap to hear
        </span>
      </div>

      <div className="ns-answer">
        <p
          className={`note-feedback-text ns-key-prompt${answered ? (answered.correct ? ' note-feedback-correct' : '') : ' ns-key-prompt-ask'}`}
          aria-live="polite"
        >
          {answered ? (
            answered.correct ? (
              <>
                <Icon name="party" /> Yes! That's {target.letter}.{correctCount <= CROWN_AT ? ` ${t('Up Melo goes!')}` : ''}
              </>
            ) : (
              t("That's {right}. You tapped {picked}.", { right: noteText(target.letter), picked: noteText(answered.picked) })
            )
          ) : (
            t('Tap the key')
          )}
        </p>
        <div className="tn-piano ns-piano">
          {KEYS.map((letter, k) => {
            const offered = lettersFor(clefMode, level, myLetters).includes(letter);
            const right = answered && letter === target.letter;
            const wrong = answered && !answered.correct && k === answered.key;
            return (
              <button
                key={k}
                className={`tn-key ns-key-${letter}${offered ? '' : ' ns-key-off'}${right ? ' ns-key-right' : ''}${wrong ? ' tn-key-wrong' : ''}`}
                onClick={() => answer(letter, k)}
                disabled={!!answered || !offered}
                aria-label={letter}
              >
                <span className="tn-key-letter">{letter}</span>
              </button>
            );
          })}
          {KEYS.map((letter, k) =>
            BLACK_AFTER.includes(letter) && k < KEYS.length - 1 ? (
              <span key={`${letter}#`} className="tn-black ns-black" style={{ '--k': k + 1 }} aria-hidden="true" />
            ) : null,
          )}
        </div>
        {answered && (
          <button className="pill-btn-primary ns-next" onClick={next}>
            {t('Next')} →
          </button>
        )}
      </div>
      {crownShow && (
        <div className="ns-crown" role="dialog" aria-label={t('{n} notes right!', { n: CROWN_AT })} onClick={() => setCrownShow(false)}>
          <div className="ns-crown-card" onClick={(e) => e.stopPropagation()}>
            <div className="ns-crown-melo">
              <Melo size={92} mood="cheer" wear={{ ...wear, hat: 'crown' }} />
            </div>
            <strong>{t('{n} notes right!', { n: CROWN_AT })}</strong>
            <span>{t('Melo got the crown')}</span>
            <em>{t('+{n} bonus', { n: CROWN_BONUS })}</em>
            <button className="pill-btn-primary" onClick={() => setCrownShow(false)}>
              {t('Keep climbing')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

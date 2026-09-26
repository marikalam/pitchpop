import { useEffect, useRef, useState } from 'react';
import { PianoEngine, playCorrectChime, playWrongBuzz } from './piano.js';
import { speakColorName, speakResults, prewarmVoices, unlockAudio } from './speech.js';
import Rainbow from './Rainbow.jsx';
import ProfileSwitcher from './ProfileSwitcher.jsx';
import { PlayerSettingsCard, AddPlayerForm, CloudAccount } from './Settings.jsx';
import { getUser, loadCloudProfiles, saveCloudProfile, deleteCloudProfile } from './cloud.js';
import { MusicNoteIcon, BookIcon, PlayTriangleIcon, SpeakerIcon, CheckIcon, XIcon } from './icons.jsx';

const COLORS = [
  { name: 'black', hex: '#232323', text: '#FFFFFF', notes: ['A', 'C', 'F'] },
  { name: 'blue', hex: '#3B6FB0', text: '#FFFFFF', notes: ['B', 'D', 'G'] },
  { name: 'red', hex: '#D6473C', text: '#FFFFFF', notes: ['C', 'E', 'G'] },
  { name: 'yellow', hex: '#E4C13B', text: '#241D00', notes: ['C', 'F', 'A'] },
  { name: 'green', hex: '#4C8858', text: '#FFFFFF', notes: ['D', 'G', 'B'] },
  { name: 'orange', hex: '#E98A2E', text: '#241300', notes: ['E', 'G', 'C'] },
  { name: 'purple', hex: '#7C4A9E', text: '#FFFFFF', notes: ['F', 'A', 'C'] },
  { name: 'pink', hex: '#D8688C', text: '#2B0714', notes: ['G', 'B', 'D'] },
  { name: 'brown', hex: '#7A5238', text: '#FFFFFF', notes: ['G', 'C', 'E'] },
];

// Used only until a player list has been saved on this device or in the
// family's cloud account; after that the saved list is the source of truth.
const DEFAULT_PROFILES = [
  { id: 'maddie', name: 'Maddie', colors: COLORS.map((c) => c.name) },
  { id: 'marcus', name: 'Marcus', colors: ['red', 'blue', 'black', 'yellow', 'orange', 'green', 'purple'] },
  { id: 'melody', name: 'Melody', colors: ['red', 'yellow'] },
];

const SESSION_ROUNDS = 10;
const MELODY_SESSION_TAPS = 20;
const PROGRESS_KEY = 'pitchpop-progress-v1';
const SESSION_KEY = 'pitchpop-session-v1';
const PROFILES_KEY = 'pitchpop-profiles-v1';
const WELCOME_KEY = 'pitchpop-welcome-seen-v1';

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQueue(names, total) {
  let queue = [];
  while (queue.length < total) {
    queue = queue.concat(shuffle(names));
  }
  return queue.slice(0, total);
}

function buildOptions(correctName, colorNames) {
  const pool = colorNames.filter((n) => n !== correctName);
  const distractors = shuffle(pool).slice(0, 3);
  const names = shuffle([correctName, ...distractors]);
  return names.map((n) => COLORS.find((c) => c.name === n));
}

function loadProfiles() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILES_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_PROFILES;
}

function saveProfiles(profiles) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore */
  }
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function AppHeader({ profile, profiles, onChangeProfile, onOpenSettings, onBack, showBack }) {
  return (
    <>
      <div className="brand-row">
        {showBack ? (
          <button className="logo-btn" onClick={onBack}>
            <h1 className="logo">
              <span className="ink">Pitch</span>
              <span className="pop-blue">P</span>
              <span className="pop-red">o</span>
              <span className="pop-green">p</span>
            </h1>
          </button>
        ) : (
          <h1 className="logo">
            <span className="ink">Pitch</span>
            <span className="pop-blue">P</span>
            <span className="pop-red">o</span>
            <span className="pop-green">p</span>
          </h1>
        )}
        {!showBack && (
          <a className="games-link-btn" href="https://marikalam.github.io/apps/">
            Apps
          </a>
        )}
      </div>
      {showBack ? (
        <div className="nav-row">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>
          <ProfileSwitcher
            profile={profile}
            profiles={profiles}
            onChange={onChangeProfile}
            onOpenSettings={onOpenSettings}
          />
        </div>
      ) : (
        <ProfileSwitcher
          profile={profile}
          profiles={profiles}
          onChange={onChangeProfile}
          onOpenSettings={onOpenSettings}
        />
      )}
    </>
  );
}

function ProgressDots({ current, total }) {
  const items = [];
  for (let i = 1; i <= total; i++) {
    items.push(<span key={`d${i}`} className={`progress-dot${i <= current ? ' progress-dot-filled' : ''}`} />);
    if (i < total) {
      items.push(<span key={`l${i}`} className={`progress-line${i < current ? ' progress-line-filled' : ''}`} />);
    }
  }
  return (
    <div className="progress-wrap">
      <div className="progress-dots">{items}</div>
      <span className="progress-count">
        {current} / {total}
      </span>
    </div>
  );
}

export default function App() {
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new PianoEngine();
  }

  const initialSessionRef = useRef(null);
  if (!initialSessionRef.current) {
    initialSessionRef.current = loadSession();
  }
  const initialSession = initialSessionRef.current;

  const [profiles, setProfiles] = useState(loadProfiles);
  // Edits on the settings screen stay in this draft until "Save" is tapped.
  const [draftProfiles, setDraftProfiles] = useState(profiles);
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem(WELCOME_KEY) !== '1');

  const [view, setView] = useState(initialSession.view || 'play-listen');
  const [profile, setProfile] = useState(initialSession.profile || profiles[0].id);
  const [lastActiveProfile, setLastActiveProfile] = useState(initialSession.lastActiveProfile || profiles[0].id);
  const [progress, setProgress] = useState(loadProgress);

  const currentProfile = profiles.find((p) => p.id === profile) || profiles[0];
  const lastProfile = profiles.find((p) => p.id === lastActiveProfile) || profiles[0];
  const profileColorNames = currentProfile.colors;

  function colorsFor(id) {
    return (profiles.find((p) => p.id === id) || profiles[0]).colors;
  }

  const [sessionQueue, setSessionQueue] = useState(
    () => initialSession.sessionQueue || buildQueue(profileColorNames, SESSION_ROUNDS),
  );
  const [roundIndex, setRoundIndex] = useState(initialSession.roundIndex ?? 0);
  const [options, setOptions] = useState(() =>
    (initialSession.optionNames || []).map((n) => COLORS.find((c) => c.name === n)).filter(Boolean),
  );
  const [answerCorrect, setAnswerCorrect] = useState(initialSession.answerCorrect || false);
  const [roundResults, setRoundResults] = useState(initialSession.roundResults || {});
  // Tracks whether each round's FIRST attempt was correct, keyed by round
  // index. roundResults keeps incrementing on every retry, so a round the
  // player missed and then got right on a second try still looked
  // "correct" in the final tally - this is what the session score (and
  // the end-of-session speech) should actually be based on.
  const [roundOutcomes, setRoundOutcomes] = useState(initialSession.roundOutcomes || {});

  const [melodyTaps, setMelodyTaps] = useState(initialSession.melodyTaps || 0);
  const [melodyColorCounts, setMelodyColorCounts] = useState(initialSession.melodyColorCounts || {});

  const [justPlayed, setJustPlayed] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  useEffect(() => {
    engineRef.current.prewarm(COLORS.map((c) => c.notes));
    prewarmVoices();

    // Mobile browsers only allow audio to start playing when it's tied to
    // a real tap. Speech is generated asynchronously, so by the time it's
    // ready the tap that triggered it may no longer count — priming a
    // silent clip on the very first tap anywhere unlocks audio for the
    // rest of the session.
    const unlock = () => {
      unlockAudio();
      document.removeEventListener('pointerdown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    saveProfiles(profiles);
  }, [profiles]);

  // A signed-in family account's player list wins over this device's copy.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getUser(), loadCloudProfiles()])
      .then(([user, cloudProfiles]) => {
        if (cancelled) return;
        setCloudUser(user);
        if (cloudProfiles?.length) {
          setProfiles(cloudProfiles);
          setCloudConnected(true);
        }
      })
      .catch((err) => console.error('PitchPop is using local profile settings', err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveSession({
      view,
      profile,
      lastActiveProfile,
      sessionQueue,
      roundIndex,
      optionNames: options.map((c) => c.name),
      answerCorrect,
      roundResults,
      roundOutcomes,
      melodyTaps,
      melodyColorCounts,
    });
  }, [
    view,
    profile,
    lastActiveProfile,
    sessionQueue,
    roundIndex,
    options,
    answerCorrect,
    roundResults,
    roundOutcomes,
    melodyTaps,
    melodyColorCounts,
  ]);

  useEffect(() => {
    if (!justPlayed) return;
    const id = setTimeout(() => setJustPlayed(null), 450);
    return () => clearTimeout(id);
  }, [justPlayed]);

  useEffect(() => {
    if (!celebrate) return;
    const id = setTimeout(() => setCelebrate(null), 1000);
    return () => clearTimeout(id);
  }, [celebrate]);

  useEffect(() => {
    if (view !== 'play-complete') return;
    const correct = Object.values(roundOutcomes).filter(Boolean).length;
    speakResults(correct, SESSION_ROUNDS);
  }, [view]);

  const currentColor = sessionQueue.length ? COLORS.find((c) => c.name === sessionQueue[roundIndex]) : null;

  function playChord(color) {
    engineRef.current.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function changeProfile(next) {
    if (profile !== 'melody') setLastActiveProfile(profile);
    if (next !== profile) {
      // A quiz round in progress is built from the outgoing profile's
      // color set - switching identity mid-round let colors outside the
      // new profile's palette (e.g. Maddie's "brown") leak into Marcus's
      // answer options. Reset to a clean state for whoever's playing now,
      // but stay on the play screen instead of bouncing to home if a
      // round was already in progress.
      setSessionQueue(buildQueue(colorsFor(next), SESSION_ROUNDS));
      setRoundIndex(0);
      setOptions([]);
      setRoundResults({});
      setRoundOutcomes({});
      setView(view.startsWith('play-') ? 'play-listen' : view);
    }
    setProfile(next);
  }

  function goHome() {
    setView('home');
  }

  function startPlay() {
    setSessionQueue(buildQueue(profileColorNames, SESSION_ROUNDS));
    setRoundIndex(0);
    setRoundResults({});
    setRoundOutcomes({});
    setView('play-listen');
  }

  function listenTap() {
    playChord(currentColor);
    setOptions(buildOptions(currentColor.name, profileColorNames));
    setView('play-question');
  }

  function relistenTap() {
    playChord(currentColor);
  }

  function chooseAnswer(color) {
    const correct = color.name === currentColor.name;
    setAnswerCorrect(correct);

    // Always track in roundResults (every attempt, including retries)
    setRoundResults((prev) => {
      const entry = prev[currentColor.name] || { correct: 0, wrong: 0 };
      return {
        ...prev,
        [currentColor.name]: {
          correct: entry.correct + (correct ? 1 : 0),
          wrong: entry.wrong + (correct ? 0 : 1),
        },
      };
    });

    // The session score only reflects each round's FIRST attempt - a
    // player can retry until they get it, but that shouldn't erase a miss.
    setRoundOutcomes((prev) => (roundIndex in prev ? prev : { ...prev, [roundIndex]: correct }));

    // Long-term accuracy needs every attempt counted in "total", not just
    // the ones that happened to be correct - otherwise accuracy is stuck
    // at 100% forever, since only correct attempts ever incremented it.
    setProgress((prev) => {
      const p = prev[profile] || { total: 0, correct: 0, perColor: {} };
      const next = {
        ...prev,
        [profile]: {
          total: p.total + 1,
          correct: p.correct + (correct ? 1 : 0),
          perColor: correct
            ? { ...p.perColor, [currentColor.name]: (p.perColor[currentColor.name] || 0) + 1 }
            : p.perColor,
        },
      };
      saveProgress(next);
      return next;
    });

    if (correct) {
      playCorrectChime();
      setTimeout(() => speakColorName(currentColor.name, currentColor.notes), 350);
      setView('play-feedback');
    } else {
      playWrongBuzz();
      setTimeout(() => speakColorName(currentColor.name, currentColor.notes), 350);
      setView('play-feedback');
    }
  }

  function hearAgainFromFeedback() {
    playChord(currentColor);
    setView('play-relisten');
  }

  function chooseDifferentAnswer() {
    setView('play-question');
  }

  function nextChord() {
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      setView('play-complete');
      return;
    }
    setRoundIndex((r) => r + 1);
    setView('play-listen');
  }

  function exploreTap(color) {
    playChord(color);
    setJustPlayed(color.name);
    setCelebrate(color.name);
  }

  function melodyTap(color) {
    if (melodyTaps >= MELODY_SESSION_TAPS) return;
    exploreTap(color);
    setMelodyTaps((t) => t + 1);
    setMelodyColorCounts((prev) => ({ ...prev, [color.name]: (prev[color.name] || 0) + 1 }));
  }

  function melodyPlayAgain() {
    setMelodyTaps(0);
    setMelodyColorCounts({});
  }

  function openSettings() {
    setDraftProfiles(profiles);
    setView('settings');
  }

  function dismissWelcome() {
    localStorage.setItem(WELCOME_KEY, '1');
    setShowWelcome(false);
  }

  function updateDraftProfile(id, changes) {
    setDraftProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }

  function saveSettings() {
    const keptIds = new Set(draftProfiles.map((p) => p.id));
    setProfiles(draftProfiles);
    if (cloudConnected) {
      draftProfiles.forEach(saveCloudProfile);
      profiles.filter((p) => !keptIds.has(p.id)).forEach((p) => deleteCloudProfile(p.id));
    }
    if (!keptIds.has(profile)) setProfile(draftProfiles[0].id);
    setView('home');
  }

  async function handleSignedIn(user) {
    setCloudUser(user);
    if (!user) {
      setCloudConnected(false);
      return;
    }
    const cloudProfiles = await loadCloudProfiles();
    if (!cloudProfiles) return;
    // A brand-new family account starts from the players on this device.
    const next = cloudProfiles.length ? cloudProfiles : profiles;
    setProfiles(next);
    setDraftProfiles(next);
    setCloudConnected(true);
    if (!cloudProfiles.length) next.forEach(saveCloudProfile);
  }

  function addPlayer(rawName) {
    const name = rawName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    setDraftProfiles((prev) => [...prev, { id, name, colors: ['red'] }]);
  }

  function removePlayer(id) {
    const target = draftProfiles.find((p) => p.id === id);
    if (!target || draftProfiles.length === 1) return;
    if (
      window.confirm(`Are you sure you want to remove ${target.name}?`) &&
      window.confirm(`Are you really sure? ${target.name}'s colors and settings will be deleted.`)
    ) {
      setDraftProfiles((prev) => prev.filter((p) => p.id !== id));
    }
  }

  const profileColors = profileColorNames.map((name) => COLORS.find((c) => c.name === name)).filter(Boolean);
  const roundCorrect = Object.values(roundOutcomes).filter(Boolean).length;
  const roundWrong = Object.values(roundOutcomes).filter((v) => v === false).length;

  if (view === 'settings') {
    return (
      <div className="page">
        <div className="app">
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            showBack
            onBack={goHome}
          />
          <h2 className="screen-title">Players &amp; colors</h2>
          <p className="screen-sub">Each player starts with red. Add colors in the order you want to learn them.</p>
          <CloudAccount user={cloudUser} onSignedIn={handleSignedIn} />
          <div className="settings-list">
            {draftProfiles.map((p) => (
              <PlayerSettingsCard
                key={p.id}
                profile={p}
                colors={COLORS}
                onUpdate={(changes) => updateDraftProfile(p.id, changes)}
                onRemove={() => removePlayer(p.id)}
                canRemove={draftProfiles.length > 1}
              />
            ))}
          </div>
          <AddPlayerForm onAdd={addPlayer} />
          <button className="pill-btn-primary pill-btn-full" onClick={saveSettings}>
            Save players &amp; colors
          </button>
          <button className="back-link back-link-center" onClick={goHome}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (profile === 'melody') {
    const melodyDone = melodyTaps >= MELODY_SESSION_TAPS;
    return (
      <div className="page">
        <div className="app">
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            showBack
            onBack={() => changeProfile(lastProfile.id)}
          />
          {melodyDone ? (
            <div className="complete-wrap">
              <div className="complete-emoji">🌟</div>
              <h2 className="screen-title">Good job, {currentProfile.name}!</h2>
              <p className="screen-sub">You pressed the buttons {MELODY_SESSION_TAPS} times.</p>
              <div className="progress-colors">
                {profileColors.map((color) => (
                  <div key={color.name} className="progress-chip" style={{ background: color.hex, color: color.text }}>
                    {color.name}: {melodyColorCounts[color.name] || 0}
                  </div>
                ))}
              </div>
              <div className="feedback-actions">
                <button className="pill-btn-primary" onClick={melodyPlayAgain}>
                  Play again →
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="melody-counter">
                {melodyTaps} / {MELODY_SESSION_TAPS}
              </div>
              <div className="melody-grid">
                {profileColors.map((color) => (
                  <button
                    key={color.name}
                    className={`melody-btn${justPlayed === color.name ? ' melody-btn-played' : ''}`}
                    style={{ background: color.hex }}
                    aria-label={`Play ${color.name} sound`}
                    onClick={() => melodyTap(color)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="app">
        {view === 'home' && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              showBack={false}
            />
            <div className="menu-list">
              <button className="menu-card menu-card-blue" onClick={startPlay}>
                <span className="icon-badge" style={{ background: 'rgba(255,255,255,0.22)' }}>
                  <MusicNoteIcon />
                </span>
                <span className="menu-text">
                  <span className="menu-title">Play</span>
                  <span className="menu-sub">Listen and identify chords</span>
                </span>
              </button>
              <button className="menu-card menu-card-purple" onClick={() => setView('explore')}>
                <span className="icon-badge" style={{ background: '#8E4FD6' }}>
                  <BookIcon />
                </span>
                <span className="menu-text">
                  <span className="menu-title">Explore</span>
                  <span className="menu-sub">Learn chords and colors</span>
                </span>
              </button>
            </div>
          </>
        )}

        {view === 'play-listen' && currentColor && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              showBack
              onBack={goHome}
            />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <h2 className="screen-title">Listen to the chord</h2>
            <p className="screen-sub">Tap the rainbow to hear it</p>
            <button className="rainbow-play-wrap" onClick={listenTap} aria-label="Play chord">
              <Rainbow colors={COLORS} activeName={null} visible pretty />
              <span className="rainbow-center-btn">
                <PlayTriangleIcon />
              </span>
            </button>
            <div className="tap-pill">Tap to listen</div>
          </>
        )}

        {view === 'play-relisten' && currentColor && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              showBack
              onBack={goHome}
            />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <h2 className="screen-title">Listen to the chord again?</h2>
            <button className="rainbow-play-wrap" onClick={relistenTap} aria-label="Replay chord">
              <Rainbow colors={COLORS} activeName={null} visible pretty />
              <span className="rainbow-center-btn">
                <SpeakerIcon />
              </span>
            </button>
            <div className="tap-pill">Tap to hear again</div>
            <button className="back-link back-link-center" onClick={chooseDifferentAnswer}>
              ← Choose a different answer
            </button>
          </>
        )}

        {view === 'play-question' && currentColor && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              showBack
              onBack={goHome}
            />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <h2 className="screen-title">What chord did you hear?</h2>
            <button className="rainbow-play-wrap rainbow-play-wrap-compact" onClick={relistenTap} aria-label="Play chord again">
              <Rainbow colors={COLORS} activeName={null} visible pretty />
              <span className="rainbow-center-btn">
                <SpeakerIcon />
              </span>
            </button>
            <div className="options-grid">
              {options.map((color) => (
                <button
                  key={color.name}
                  className="option-btn"
                  style={{ background: color.hex, color: color.text }}
                  onClick={() => chooseAnswer(color)}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'play-feedback' && currentColor && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              showBack
              onBack={goHome}
            />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <div className={`feedback-icon-wrap${answerCorrect ? ' feedback-correct' : ' feedback-incorrect'}`}>
              {answerCorrect && (
                <div className="feedback-confetti" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <span className="feedback-icon">{answerCorrect ? <CheckIcon /> : <XIcon />}</span>
            </div>
            <h2 className="screen-title">{answerCorrect ? 'Great job!' : 'Almost!'}</h2>
            <p className="screen-sub">{answerCorrect ? "That's right!" : 'The correct answer is:'}</p>
            <div className="answer-card" style={{ background: currentColor.hex, color: currentColor.text }}>
              <div className="answer-name">{currentColor.name}</div>
              <div className="answer-notes">{currentColor.notes.join(' · ')}</div>
            </div>
            <div className="feedback-actions">
              {answerCorrect ? (
                <>
                  <button className="pill-btn-secondary" onClick={hearAgainFromFeedback}>
                    🔊 Hear again
                  </button>
                  <button className="pill-btn-primary" onClick={nextChord}>
                    {roundIndex + 1 >= SESSION_ROUNDS ? 'Finish' : 'Next chord'} →
                  </button>
                </>
              ) : (
                <button className="pill-btn-primary pill-btn-full" onClick={chooseDifferentAnswer}>
                  Try again →
                </button>
              )}
            </div>
          </>
        )}

        {view === 'play-complete' && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              showBack
              onBack={goHome}
            />
            <div className="complete-wrap">
              <div className="complete-emoji">🎉</div>
              <h2 className="screen-title">All done!</h2>
              <p className="screen-sub">
                You went through all {SESSION_ROUNDS} chords for {currentProfile.name}.
              </p>
            </div>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="stat-number">{roundCorrect}</div>
                <div className="stat-label">Correct</div>
              </div>
              <div className="stat-tile">
                <div className="stat-number">{roundWrong}</div>
                <div className="stat-label">Wrong</div>
              </div>
            </div>
            <div className="feedback-actions">
              <button className="pill-btn-secondary" onClick={goHome}>
                Home
              </button>
              <button className="pill-btn-primary" onClick={startPlay}>
                Play again →
              </button>
            </div>
          </>
        )}

        {view === 'explore' && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              showBack
              onBack={goHome}
            />
            <h2 className="screen-title">Explore</h2>
            <p className="screen-sub">Tap a pad to play its chord</p>
            <div className="rainbow-slot">
              <Rainbow colors={COLORS} activeName={celebrate} visible={!!celebrate} />
            </div>
            <div className="grid">
              {profileColors.map((color) => (
                <button
                  key={color.name}
                  className={`pad${justPlayed === color.name ? ' pad-played' : ''}`}
                  style={{ background: color.hex, color: color.text }}
                  aria-label={`Play ${color.name} chord`}
                  onClick={() => exploreTap(color)}
                >
                  <div className="pad-name">{color.name}</div>
                  <div className="pad-notes">{color.notes.join(' ')}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {showWelcome && view !== 'settings' && (
          <div className="welcome-backdrop">
            <div className="welcome-card" role="dialog" aria-labelledby="welcome-title">
              <div className="welcome-emoji">🌈</div>
              <h2 id="welcome-title">Welcome to PitchPop!</h2>
              <p>Start with one color, red. When it feels easy, add yellow, then more colors one at a time.</p>
              <p>
                Choose a player to begin. An adult can open <strong>Players &amp; colors</strong> to change the color
                order or add a new player.
              </p>
              <button className="pill-btn-primary pill-btn-full" onClick={dismissWelcome}>
                Let’s start
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

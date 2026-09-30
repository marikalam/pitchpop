import { useEffect, useRef, useState } from 'react';
import { PianoEngine, playCorrectChime, playWrongBuzz } from './piano.js';
import { speakColorName, speakResults, prewarmVoices, unlockAudio } from './speech.js';
import Rainbow from './Rainbow.jsx';
import ProfileSwitcher from './ProfileSwitcher.jsx';
import { PlayerSettingsCard, AddPlayerForm, AccountButton, AccountScreen, SyncStatus } from './Settings.jsx';
import NoteSpeller from './NoteSpeller.jsx';
import Piano from './Piano.jsx';
import PracticeMode from './PracticeMode.jsx';
import MusicTheory from './MusicTheory.jsx';
import { getUser, loadCloudProfiles, saveCloudProfile, deleteCloudProfile, onAuthEvent } from './cloud.js';
import { PlayTriangleIcon, SpeakerIcon, CheckIcon, XIcon } from './icons.jsx';
import { loadStreakDays, recordStreakDay, streakFor } from './streak.js';

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

// Players come from one of two lists. Signed in, it's the family account's
// players (cached on the device under PROFILES_KEY, which is also where
// players were kept before accounts were required to see them). Signed
// out, it's this device's own guest players (GUEST_PROFILES_KEY), which
// start as one generic player with a few colors so the first color test
// has real choices in it. A family's players never show while signed out.
const DEFAULT_PROFILES = [{ id: 'player-1', name: 'Player 1', colors: ['red', 'yellow', 'blue'] }];
// Older versions shipped with these built-in players, and devices that ran
// them still have them saved under PROFILES_KEY. They're sample players,
// not the family's, so they never carry over into a new account. (Players
// someone added themselves get a timestamped id, so a real "Maddie" stays.)
const OLD_SAMPLE_PROFILE_IDS = new Set(['maddie', 'marcus', 'melody']);

const SESSION_ROUNDS = 10;
const MELODY_SESSION_TAPS = 20;
const PROGRESS_KEY = 'pitchpop-progress-v1';
const SESSION_KEY = 'pitchpop-session-v1';
const PROFILES_KEY = 'pitchpop-profiles-v1';
const GUEST_PROFILES_KEY = 'pitchpop-guest-profiles-v1';
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

// A device that has never saved a player list is a first-time visitor -
// they land on the intro screen instead of straight in a quiz.
function isFirstVisit() {
  try {
    return localStorage.getItem(PROFILES_KEY) === null && localStorage.getItem(GUEST_PROFILES_KEY) === null;
  } catch {
    return false;
  }
}

// null when that list was never saved on this device.
function loadSavedProfiles(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    /* ignore */
  }
  return null;
}

// The players this device kept for the family before accounts, minus the
// old built-in sample players; null if that leaves none.
function loadPreAccountProfiles() {
  const kept = (loadSavedProfiles(PROFILES_KEY) || []).filter((p) => !OLD_SAMPLE_PROFILE_IDS.has(p.id));
  return kept.length ? kept : null;
}

function loadGuestProfiles() {
  return loadSavedProfiles(GUEST_PROFILES_KEY) || DEFAULT_PROFILES;
}

function saveProfiles(profiles, owner) {
  try {
    localStorage.setItem(owner === 'account' ? PROFILES_KEY : GUEST_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore */
  }
}

// `list` followed by any guest players it doesn't already have.
function withGuests(list, guests) {
  const ids = new Set(list.map((p) => p.id));
  return [...list, ...guests.filter((p) => !ids.has(p.id))];
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

function AppHeader({
  profile,
  profiles,
  user,
  onChangeProfile,
  onOpenSettings,
  onOpenAccount,
  onOpenTool,
  onBack,
  showBack,
  hideProfile = false,
}) {
  return (
    <>
      <div className="brand-row">
        {showBack ? (
          <button className="logo-btn" onClick={onBack}>
            <h1 className="logo">
              <img className="logo-mark" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
              <span className="ink">Pitch</span>
              <span className="pop-blue">P</span>
              <span className="pop-red">o</span>
              <span className="pop-green">p</span>
            </h1>
          </button>
        ) : (
          <h1 className="logo">
            <img className="logo-mark" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
            <span className="ink">Pitch</span>
            <span className="pop-blue">P</span>
            <span className="pop-red">o</span>
            <span className="pop-green">p</span>
          </h1>
        )}
        <div className="brand-actions">
          <AccountButton user={user} onClick={onOpenAccount} />
        </div>
      </div>
      {showBack ? (
        <div className="nav-row">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>
          <ProfileSwitcher
            profile={profile}
            profiles={profiles}
            colors={COLORS}
            onChange={onChangeProfile}
            onOpenSettings={onOpenSettings}
            onOpenTool={onOpenTool}
          />
        </div>
      ) : hideProfile ? null : (
        <ProfileSwitcher
          profile={profile}
          profiles={profiles}
          colors={COLORS}
          onChange={onChangeProfile}
          onOpenSettings={onOpenSettings}
          onOpenTool={onOpenTool}
        />
      )}
    </>
  );
}

function StreakBadge({ streak }) {
  if (streak.current === 0) {
    return <div className="streak-badge streak-badge-empty">🔥 Finish a round to start a streak</div>;
  }
  return (
    <div className={`streak-badge${streak.doneToday ? '' : ' streak-badge-pending'}`}>
      <span className="streak-flame" aria-hidden="true">🔥</span>
      <span>
        <strong>
          {streak.current} {streak.current === 1 ? 'day' : 'days'} in a row
        </strong>
        {!streak.doneToday && <span className="streak-hint">Finish a round today to keep it going</span>}
      </span>
    </div>
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
  const firstVisitRef = useRef(null);
  if (firstVisitRef.current === null) {
    firstVisitRef.current = isFirstVisit();
  }

  const [profiles, setProfiles] = useState(loadGuestProfiles);
  // Which list `profiles` currently is: 'guest' or 'account'.
  const [profileOwner, setProfileOwner] = useState('guest');
  // Edits on the settings screen stay in this draft until "Save" is tapped.
  const [draftProfiles, setDraftProfiles] = useState(profiles);
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem(WELCOME_KEY) !== '1');

  const [profile, setProfile] = useState(profiles[0].id);
  const [lastActiveProfile, setLastActiveProfile] = useState(initialSession.lastActiveProfile || profiles[0].id);
  const [progress, setProgress] = useState(loadProgress);
  const [streakDays, setStreakDays] = useState(loadStreakDays);

  const currentProfile = profiles.find((p) => p.id === profile) || profiles[0];
  const lastProfile = profiles.find((p) => p.id === lastActiveProfile) || profiles[0];
  const profileColorNames = currentProfile.colors;
  const streak = streakFor(streakDays[profile]);

  function colorsFor(id) {
    return (profiles.find((p) => p.id === id) || profiles[0]).colors;
  }

  // Always opening on the first-listed profile (above) means a saved
  // mid-quiz session built for whoever played *last* would otherwise get
  // resumed under the wrong kid's name and color set. Only trust the saved
  // quiz state when it actually belongs to the profile we're defaulting to;
  // a saved non-quiz screen (home, settings, ...) is fine to restore either
  // way, same as changeProfile's own reset only touches "play-" views.
  const profileMismatch = initialSession.profile !== undefined && initialSession.profile !== profiles[0].id;
  const resumableSession = profileMismatch ? {} : initialSession;

  const [view, setView] = useState(() => {
    if (firstVisitRef.current) return 'intro';
    // 'home' no longer exists (there's nothing to hub to - Play is the
    // whole app), so a session saved before this change falls back to Play.
    const savedView = initialSession.view === 'home' ? 'play-listen' : initialSession.view || 'play-listen';
    return profileMismatch && savedView.startsWith('play-') ? 'play-listen' : savedView;
  });
  const [preExploreView, setPreExploreView] = useState('play-listen');
  const [preToolView, setPreToolView] = useState('play-listen');
  const [sessionQueue, setSessionQueue] = useState(
    () => resumableSession.sessionQueue || buildQueue(profileColorNames, SESSION_ROUNDS),
  );
  const [roundIndex, setRoundIndex] = useState(resumableSession.roundIndex ?? 0);
  const [options, setOptions] = useState(() =>
    (resumableSession.optionNames || []).map((n) => COLORS.find((c) => c.name === n)).filter(Boolean),
  );
  const [answerCorrect, setAnswerCorrect] = useState(resumableSession.answerCorrect || false);
  const [roundResults, setRoundResults] = useState(resumableSession.roundResults || {});
  // Tracks whether each round's FIRST attempt was correct, keyed by round
  // index. roundResults keeps incrementing on every retry, so a round the
  // player missed and then got right on a second try still looked
  // "correct" in the final tally - this is what the session score (and
  // the end-of-session speech) should actually be based on.
  const [roundOutcomes, setRoundOutcomes] = useState(resumableSession.roundOutcomes || {});

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
    saveProfiles(profiles, profileOwner);
  }, [profiles, profileOwner]);

  // Switches between the guest and account player lists. If whoever is
  // playing isn't in the new list, start fresh with its first player.
  function showProfiles(list, owner) {
    setProfiles(list);
    setDraftProfiles(list);
    setProfileOwner(owner);
    setProfile((current) => {
      if (list.some((p) => p.id === current)) return current;
      setLastActiveProfile(list[0].id);
      setSessionQueue(buildQueue(list[0].colors, SESSION_ROUNDS));
      setRoundIndex(0);
      setOptions([]);
      setRoundResults({});
      setRoundOutcomes({});
      setView((v) => (v.startsWith('play-') ? 'play-listen' : v));
      return list[0].id;
    });
  }

  // Signed in on load: show the family account's players (or the copy
  // cached on this device if the account can't be reached right now).
  useEffect(() => {
    let cancelled = false;
    Promise.all([getUser(), loadCloudProfiles()])
      .then(([user, cloudProfiles]) => {
        if (cancelled || !user) return;
        setCloudUser(user);
        if (cloudProfiles?.length) {
          showProfiles(cloudProfiles, 'account');
          setCloudConnected(true);
        } else {
          const cached = loadPreAccountProfiles();
          if (cached) showProfiles(cached, 'account');
        }
      })
      .catch((err) => console.error('PitchPop is using local profile settings', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Clicking the link in a "reset your password" email lands back here with
  // a recovery session already active - Supabase surfaces that as this
  // event rather than a normal sign-in, so the account screen can jump
  // straight to "choose a new password" instead of asking to sign in first.
  useEffect(() => {
    const unsubscribe = onAuthEvent((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setView('account');
      }
    });
    return unsubscribe;
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

  // Says the color name, then plays its real notes one at a time right
  // after - so "Blue" is followed by the actual B, D, G pitches instead of
  // a voice just naming letters with no real connection to the chord.
  async function announceColor(color) {
    await speakColorName(color.name);
    engineRef.current.playNoteSequence(color.notes);
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

  // There's no home menu anymore - "back" just means "back to playing".
  function goHome() {
    startPlay();
  }

  function startPlay() {
    setSessionQueue(buildQueue(profileColorNames, SESSION_ROUNDS));
    setRoundIndex(0);
    setRoundResults({});
    setRoundOutcomes({});
    setView('play-listen');
  }

  // Explore is reachable from the "Playing as" dropdown on every screen,
  // including mid-quiz - closing it should return to wherever the player
  // actually was, not reset their progress.
  function openExplore() {
    setPreExploreView(view);
    setView('explore');
  }

  function closeExplore() {
    setView(preExploreView);
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
      setTimeout(() => announceColor(currentColor), 350);
      setView('play-feedback');
    } else {
      playWrongBuzz();
      setTimeout(() => announceColor(currentColor), 350);
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
      setStreakDays(recordStreakDay(streakDays, profile));
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
    if (melodyTaps + 1 === MELODY_SESSION_TAPS) setStreakDays(recordStreakDay(streakDays, profile));
    setMelodyTaps((t) => t + 1);
    setMelodyColorCounts((prev) => ({ ...prev, [color.name]: (prev[color.name] || 0) + 1 }));
  }

  function melodyPlayAgain() {
    setMelodyTaps(0);
    setMelodyColorCounts({});
  }

  function openAccount() {
    setView('account');
  }

  function openNoteSpeller() {
    setView('notespeller');
  }

  // Piano, Practice Mode and Music Theory are side trips like Explore:
  // closing one goes back to wherever the player was (a quiz in progress
  // included) instead of restarting the color game.
  const TOOL_VIEWS = ['piano', 'practice', 'theory'];

  function openTool(id) {
    if (id === 'explore') return openExplore();
    if (id === 'notespeller') return openNoteSpeller();
    if (!TOOL_VIEWS.includes(view)) setPreToolView(view);
    setView(id);
  }

  function closeTool() {
    setView(TOOL_VIEWS.includes(preToolView) ? 'play-listen' : preToolView);
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
    // Back to a fresh color test, built from the saved colors of whoever
    // is playing (their colors may just have changed).
    const player = draftProfiles.find((p) => p.id === profile) || draftProfiles[0];
    setProfile(player.id);
    setSessionQueue(buildQueue(player.colors, SESSION_ROUNDS));
    setRoundIndex(0);
    setOptions([]);
    setRoundResults({});
    setRoundOutcomes({});
    setView('play-listen');
  }

  async function handleSignedIn(user) {
    setCloudUser(user);
    if (!user) {
      setCloudConnected(false);
      showProfiles(loadGuestProfiles(), 'guest');
      return;
    }
    const cloudProfiles = await loadCloudProfiles();
    if (!cloudProfiles) return;
    // A brand-new family account starts from the players made on this
    // device: any kept for the family from before sign-in was required,
    // plus the guest players (e.g. one added just before signing up).
    const next = cloudProfiles.length ? cloudProfiles : withGuests(loadPreAccountProfiles() || [], profiles);
    showProfiles(next, 'account');
    setCloudConnected(true);
    if (!cloudProfiles.length) next.forEach(saveCloudProfile);

    // Signing in is the start of a play session: go straight to a fresh
    // color test for the selected player (or the account's first player).
    const player = next.find((p) => p.id === profile) || next[0];
    setProfile(player.id);
    setSessionQueue(buildQueue(player.colors, SESSION_ROUNDS));
    setRoundIndex(0);
    setOptions([]);
    setRoundResults({});
    setRoundOutcomes({});
    setView('play-listen');
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

  if (view === 'account') {
    return (
      <div className="page">
        <div className="app">
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            showBack
            onBack={goHome}
          />
          <h2 className="screen-title">Account</h2>
          <AccountScreen
            user={cloudUser}
            playerCount={profiles.length}
            onSignedIn={handleSignedIn}
            onOpenPlayers={openSettings}
            onDone={goHome}
            recoveryMode={passwordRecovery}
            onPasswordUpdated={() => setPasswordRecovery(false)}
          />
        </div>
      </div>
    );
  }

  if (view === 'notespeller') {
    return (
      <div className="page">
        <div className="app">
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            showBack
            onBack={goHome}
          />
          <NoteSpeller
            engine={engineRef.current}
            onComplete={() => setStreakDays(recordStreakDay(streakDays, profile))}
          />
        </div>
      </div>
    );
  }

  if (view === 'piano') {
    return <Piano engine={engineRef.current} onClose={closeTool} />;
  }

  if (view === 'practice' || view === 'theory') {
    return (
      <div className="page">
        <div className="app">
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            showBack
            onBack={closeTool}
          />
          {view === 'practice' ? (
            <PracticeMode profileId={currentProfile.id} profileName={currentProfile.name} />
          ) : (
            <MusicTheory />
          )}
        </div>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="page">
        <div className="app">
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            showBack
            onBack={goHome}
          />
          <h2 className="screen-title">Players &amp; colors</h2>
          <p className="screen-sub">Each player starts with red. Add colors in the order you want to learn them.</p>
          <SyncStatus user={cloudUser} onOpenAccount={openAccount} />
          <div className="settings-list">
            {draftProfiles.map((p) => (
              <PlayerSettingsCard
                key={p.id}
                profile={p}
                colors={COLORS}
                onUpdate={(changes) => updateDraftProfile(p.id, changes)}
                onRemove={() => removePlayer(p.id)}
                canRemove={draftProfiles.length > 1}
                playDays={streakDays[p.id]}
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
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            showBack
            onBack={() => changeProfile(lastProfile.id)}
          />
          {melodyDone ? (
            <div className="complete-wrap">
              <div className="complete-emoji">🌟</div>
              <h2 className="screen-title">Good job, {currentProfile.name}!</h2>
              <p className="screen-sub">You pressed the buttons {MELODY_SESSION_TAPS} times.</p>
              <StreakBadge streak={streak} />
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
              <StreakBadge streak={streak} />
              <div className="melody-counter">
                {melodyTaps} / {MELODY_SESSION_TAPS}
              </div>
              <div className={`melody-grid${profileColors.length > 4 ? ' melody-grid-2col' : ''}`}>
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
        {view === 'intro' && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
              hideProfile
            />
            <div className="rainbow-slot">
              <Rainbow colors={COLORS} activeName={celebrate} visible />
            </div>
            <h2 className="intro-title">Every chord has a color</h2>
            <p className="screen-sub intro-sub">
              PitchPop teaches kids to recognize chords by ear. Each chord gets its own color. Tap one to hear it!
            </p>
            <div className="grid intro-grid">
              {COLORS.map((color) => (
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
            <ol className="intro-steps">
              <li>
                <span aria-hidden="true">🎧</span>Hear a chord
              </li>
              <li>
                <span aria-hidden="true">🎨</span>Pick its color
              </li>
              <li>
                <span aria-hidden="true">🌈</span>Add colors as you learn
              </li>
            </ol>
            <button className="pill-btn-primary pill-btn-full intro-cta" onClick={startPlay}>
              Take the color test →
            </button>
            {!cloudUser && (
              <button className="back-link back-link-center" onClick={openAccount}>
                Have an account? Sign in
              </button>
            )}
          </>
        )}

        {view === 'explore' && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
              showBack
              onBack={closeExplore}
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

        {view === 'play-listen' && currentColor && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
              showBack
              onBack={goHome}
            />
            <StreakBadge streak={streak} />
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
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
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
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
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
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
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
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
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
              <div className="stat-tile">
                <div className="stat-number">🔥 {streak.current}</div>
                <div className="stat-label">{streak.current === 1 ? 'Day' : 'Days'} in a row</div>
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

        {showWelcome && view !== 'settings' && view !== 'account' && (
          <div className="welcome-backdrop">
            <div className="welcome-card" role="dialog" aria-labelledby="welcome-title">
              <div className="welcome-emoji">🌈</div>
              <h2 id="welcome-title">Welcome to PitchPop!</h2>
              <p>
                A playful way for kids to train their ear. Every chord has its own color: hear a chord, then pick the
                color that matches.
              </p>
              <p>
                Start with a few colors and add more as they get easy. Sign in to save your family’s players on every
                device.
              </p>
              <button className="pill-btn-primary pill-btn-full" onClick={dismissWelcome}>
                Let’s go
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

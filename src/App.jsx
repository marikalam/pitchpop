import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PianoEngine, noteLabel, playCorrectChime, playLogoPop, playWrongBuzz } from './piano.js';
import { prewarmVoices, setSpeechLanguage, speakColorName, speakResults, speechLanguage, unlockAudio } from './speech.js';
import { voiceLang } from './voiceLang.js';
import { isCurrent, later, newSound } from './soundBus.js';
import Rainbow from './Rainbow.jsx';
import NewColor, { markColorMet, newColorFor } from './NewColor.jsx';
import LogoMark from './LogoMark.jsx';
import ProfileSwitcher from './ProfileSwitcher.jsx';
import MainMenu from './MainMenu.jsx';
import { PlayerSettingsCard, AddPlayerForm, AccountButton, AccountScreen, SyncStatus, LearningGuide } from './Settings.jsx';
import NoteSpeller from './NoteSpeller.jsx';
import TinyTots from './TinyTots.jsx';
import Progress from './Progress.jsx';
import StickerPicker from './StickerPicker.jsx';
import StickerBook from './StickerBook.jsx';
import { earnSticker, pendingStickers, playerStickers } from './stickerStore.js';
import Sticker from './Sticker.jsx';
import { STICKERS } from './stickers.js';
import { weekProgress } from './progress.js';
import { scheduleReminders } from './reminders.js';
import { inSingleNotes, inTinyTots, singleNotesStyle } from './tinyTots.js';
import SingleNotes from './SingleNotes.jsx';
import TypeNotes from './TypeNotes.jsx';
import ProgressDots from './ProgressDots.jsx';
import SoundTest from './SoundTest.jsx';
import { typesNotes } from './typeNotes.js';
import { buildSmartRound, checkPairFor, comebackQueue } from './smartRound.js';
import Piano from './Piano.jsx';
import PracticeMode, { readPracticeTimer, showTimerTab, startPracticeNow, stopPractice } from './PracticeMode.jsx';
import PracticeBadge, { EndPracticeButton } from './PracticeBadge.jsx';
import MusicTheory from './MusicTheory.jsx';
import MethodInfo from './MethodInfo.jsx';
import Scales from './Scales.jsx';
import Hanon from './Hanon.jsx';
import { canViewStats, deleteCloudProfile, getUser, loadCloudProfiles, onAuthEvent, rememberedAccount, saveCloudProfile, signInFromLink } from './cloud.js';
import { listenForAppLinks, listenForWidgetLinks } from './appLink.js';
import { SoundNotice } from './SoundButton.jsx';
import { useScreenHistory } from './screenHistory.js';
import { colorToWorkOn, loadRoundHistory, recordRound, summarizeRound } from './roundHistory.js';
import ScoreCelebration, { scoreTier, TIER_TEXT } from './ScoreCelebration.jsx';
import { PlayTriangleIcon, SpeakerIcon, CheckIcon, XIcon } from './icons.jsx';
import { dayKey, loadStreakDays, recordStreakDay, streakFor } from './streak.js';
import { setKeepRecords } from './records.js';
import { startHistorySync } from './historySync.js';
import { practiceElsewhere, startLivePractice } from './livePractice.js';
import { FREE_COLORS, hasPlan, notePhone, plansOn, startPlans } from './plan.js';
import Paywall from './Paywall.jsx';
import TodayPlan from './TodayPlan.jsx';
import { markDoneToday, todayPlan } from './todayPlan.js';
import { statAppOpened, statRoundDone } from './stats.js';
import StatsScreen from './StatsScreen.jsx';
import { usesBlackKeys } from './blackKeys.js';
import { loadPracticeLog } from './practiceLog.js';
import Icon from './Icon.jsx';

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
  // The first chord with a black key (A major).
  { name: 'light green', hex: '#9CCC65', text: '#1E3510', notes: ['A', 'C#', 'E'] },
  { name: 'beige', hex: '#E4CFA6', text: '#3D2E17', notes: ['D', 'F#', 'A'] },
];

// Players come from one of two lists. Signed in, it's the family account's
// players (cached on the device under PROFILES_KEY, which is also where
// players were kept before accounts were required to see them). Signed
// out, it's this device's own guest players (GUEST_PROFILES_KEY), which
// start as one generic player with a few colors so the first color test
// has real choices in it. A family's players never show while signed out.
const NO_TRIES = { out: [], reveal: false };
// Made once: making a date format is slow on iPhones.
const SHORT_WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

const DEFAULT_PROFILES = [{ id: 'player-1', name: 'Guest Player', colors: ['red', 'yellow', 'blue'] }];
const GUEST_NAME = 'Guest Player';
// Older versions shipped with these built-in players, and devices that ran
// them still have them saved under PROFILES_KEY. They're sample players,
// not the family's, so they never carry over into a new account. (Players
// someone added themselves get a timestamped id, so a real "Maddie" stays.)
const OLD_SAMPLE_PROFILE_IDS = new Set(['maddie', 'marcus', 'melody']);

// Chords in a round of Pitch Practice (about one Eguchi session).
const SESSION_ROUNDS = 20;
// The home page's tiles under Today's practice.
// What PitchPop Family adds (plan.js); everything else is free.
const PAID_VIEWS = ['scales', 'hanon', 'progress', 'notespeller'];
// This phone's PitchPop-before-the-plan check happens on first run.
notePhone();

const HOME_CARDS = [
  { id: 'explore', icon: 'notes', title: 'Explore', from: '#f2a93b', to: '#e07b2a' },
  { id: 'piano', icon: 'keys', title: 'Piano', from: '#9b6ef3', to: '#7a4fd6' },
  { id: 'practice', icon: 'timer', title: 'Practice', from: '#f7a24f', to: '#e8792f' },
  { id: 'scales', icon: 'scales', title: 'Scales', from: '#2fb3c4', to: '#1f8fa0' },
  { id: 'hanon', icon: 'dumbbell', title: 'Hanon', from: '#5b6ee8', to: '#3f4fc4' },
  { id: 'notespeller', icon: 'staff', title: 'Notes', from: '#3fbf7f', to: '#2a9d63' },
  { id: 'theory', icon: 'book', title: 'Theory', from: '#f06f9a', to: '#d94f7e' },
  { id: 'method', icon: 'cap', title: 'How it works', from: '#8a94a8', to: '#6b7488' },
];
const MELODY_SESSION_TAPS = 20;
// The screen PitchPop was on when it last went into the background, to
// reopen a piano tool (Scales, Hanon...) after the iPhone closed PitchPop
// during a practice.
const LAST_TOOL_KEY = 'pitchpop-last-tool-v1';
// The loading screen when the app opens signed in (see `opening`).
const OPENING_MIN_MS = 700;
const OPENING_MAX_MS = 5000;
const PROGRESS_KEY = 'pitchpop-progress-v1';
const SESSION_KEY = 'pitchpop-session-v1';
const PROFILES_KEY = 'pitchpop-profiles-v1';
const GUEST_PROFILES_KEY = 'pitchpop-guest-profiles-v1';
const WELCOME_KEY = 'pitchpop-welcome-seen-v1';
// Screens only a signed-in family can open.
// Everything this device keeps about players: their lists, progress,
// streaks and practice. Cleared when the account is deleted. (App-wide
// preferences like the NoteSpeller clef or piano labels stay.)
const PLAYER_DATA_KEYS = [
  PROFILES_KEY,
  GUEST_PROFILES_KEY,
  PROGRESS_KEY,
  SESSION_KEY,
  'pitchpop-streak-days-v1',
  'pitchpop-practice-v1',
  'pitchpop-practice-log-v1',
];

const capName = (n) => n.charAt(0).toUpperCase() + n.slice(1);

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

// The order colors are usually learned in (red first).
const LEARNING_ORDER = ['red', 'yellow', 'blue', 'black', 'green', 'orange', 'purple', 'pink', 'brown', 'light green', 'beige'];

// Every color the player is learning is an answer, like a full set of
// flags, always in learning order, so each color stays in the same spot
// round after round.
function buildOptions(colorNames) {
  return LEARNING_ORDER.filter((n) => colorNames.includes(n)).map((n) => COLORS.find((c) => c.name === n));
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

// Signed out, there's exactly one player, always called "Guest Player" -
// never a family member's name. An older device may have several guest
// players saved; keep the first one's id and colors (so its progress
// stays) under the guest name.
function loadGuestProfiles() {
  const saved = loadSavedProfiles(GUEST_PROFILES_KEY);
  if (!saved) return DEFAULT_PROFILES;
  return [{ ...saved[0], name: GUEST_NAME }];
}

function saveProfiles(profiles, owner) {
  try {
    localStorage.setItem(owner === 'account' ? PROFILES_KEY : GUEST_PROFILES_KEY, JSON.stringify(profiles));
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

// The "PitchPop" word next to the logo. When hidden it stays measurable
// (see useCompactLogo) but takes no room.
// `playing` (from a logo tap) makes the P, o, p hop one after another.
function LogoWord({ hidden, playing = 0 }) {
  return (
    <span className={`logo-word${hidden ? ' logo-word-hidden' : ''}`} aria-hidden={hidden || undefined}>
      <span className="ink">Pitch</span>
      <span key={playing} className={playing ? 'logo-word-play' : undefined}>
        <span className="pop-blue">P</span>
        <span className="pop-red">o</span>
        <span className="pop-green">p</span>
      </span>
    </span>
  );
}

// On a narrow phone the header can't fit the ☰ menu, the logo word, the
// player pill and the account button in one row; then the word is hidden
// and just the app icon shows. Measured, since the pill and account
// button change width with the player's name and signing in.
function useCompactLogo(rowRef) {
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return undefined;
    const check = () => {
      const left = row.querySelector('.brand-left');
      const right = row.querySelector('.brand-actions');
      const word = row.querySelector('.logo-word');
      if (!left || !right || !word) return;
      // The left side's width with the word showing, whether or not it is.
      const wordWidth = word.getBoundingClientRect().width;
      const leftWithWord = word.classList.contains('logo-word-hidden')
        ? left.getBoundingClientRect().width + wordWidth
        : left.getBoundingClientRect().width;
      setCompact(leftWithWord + right.getBoundingClientRect().width + 12 > row.clientWidth);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(row);
    observer.observe(row.querySelector('.brand-actions'));
    // The word changes width when the logo font finishes loading.
    observer.observe(row.querySelector('.logo-word'));
    return () => observer.disconnect();
  }, [rowRef]);
  return compact;
}

function AppHeader({
  profile,
  profiles,
  user,
  onChangeProfile,
  onOpenSettings,
  onOpenAccount,
  onOpenTool,
  onOpenPractice,
  onBack,
  showBack,
  hideProfile = false,
}) {
  const rowRef = useRef(null);
  const compact = useCompactLogo(rowRef);
  const [logoPlaying, setLogoPlaying] = useState(0);
  return (
    <>
      <div className="brand-row" ref={rowRef}>
        <div className="brand-left">
          <MainMenu onOpen={onOpenTool} />
          {/* Tapping the logo plays its little animation and a fun sound
              (so you know the sound works), and away from the home page
              also goes back home. */}
          <button
            className="logo-btn"
            aria-label={showBack ? 'PitchPop - back to home' : 'PitchPop'}
            onClick={() => {
              setLogoPlaying((n) => n + 1);
              // After going home (which quiets any other sound), so the
              // logo's sound isn't cut off.
              if (showBack) onBack();
              playLogoPop();
            }}
          >
            <h1 className="logo">
              <LogoMark playing={logoPlaying} />
              <LogoWord hidden={compact} playing={logoPlaying} />
            </h1>
          </button>
        </div>
        <div className="brand-actions">
          {!hideProfile && (
            <ProfileSwitcher
              profile={profile}
              profiles={profiles}
              colors={COLORS}
              onChange={onChangeProfile}
              onOpenSettings={onOpenSettings}
            />
          )}
          <AccountButton user={user} onClick={onOpenAccount} />
        </div>
      </div>
      {showBack ? (
        <div className="nav-row">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>
          <div className="nav-row-right">
            <SoundNotice />
            {onOpenPractice && <PracticeBadge onOpen={onOpenPractice} />}
          </div>
        </div>
      ) : (
        // On the home page a running practice shows as the End practice
        // button in the greeting instead (with its minutes).
        <div className="nav-row nav-row-home">
          <SoundNotice />
        </div>
      )}
    </>
  );
}

function StreakBadge({ streak }) {
  if (streak.current === 0) {
    return <div className="streak-badge streak-badge-empty"><Icon name="flame" /> Finish a round to start a streak</div>;
  }
  return (
    <div className={`streak-badge${streak.doneToday ? '' : ' streak-badge-pending'}`}>
      <span className="streak-flame" aria-hidden="true"><Icon name="flame" /></span>
      <span>
        <strong>
          {streak.current} {streak.current === 1 ? 'day' : 'days'} in a row
        </strong>
        {!streak.doneToday && <span className="streak-hint">Finish a round today to keep it going</span>}
      </span>
    </div>
  );
}

// The label over a warm-up chord or a mix-up check.
function KindChip({ focus, index, name }) {
  const kind = focus?.kinds?.[index];
  if (kind === 'check' && !checkPairFor(focus, index, name)) return null;
  if (kind === 'warmup') return <span className="kind-chip kind-chip-warmup"><Icon name="repeat" /> Missed last time</span>;
  if (kind === 'check') return <span className="kind-chip kind-chip-check"><Icon name="target" /> Mix-up check</span>;
  return null;
}

// "All done!": an animation for the score, the numbers, the color to
// practice next, and this player's recent rounds.
// "Today's focus" at the start of a smart round.
function FocusTag({ focus }) {
  const color = COLORS.find((c) => c.name === focus.name);
  const cap = (n) => n.charAt(0).toUpperCase() + n.slice(1);
  if (!color) return null;
  return (
    <div className="focus-tag">
      <span className="focus-swatch" style={{ background: color.hex }} aria-hidden="true" />
      <span>
        <Icon name="target" /> Today's focus: <b>{cap(focus.name)}</b>
        {focus.partner ? ` (mixed up with ${cap(focus.partner)})` : ''}
        {focus.kinds && (
          <span className="focus-legend">
            <span><i className="legend-easy" />Easy win</span>
            {focus.warmup?.length > 0 && (
              <span><i className="legend-warmup" />Missed last time</span>
            )}
            {focus.checks && (
              <span><i className="legend-check" />Mix-up check</span>
            )}
          </span>
        )}
      </span>
    </div>
  );
}

function RoundSummary({ playerId, playerName, colorNames = [], correct, wrong, streak, summary, history, focus, signedIn, onStick, onSignIn, then }) {
  const tier = scoreTier(correct, summary.total);
  const text = TIER_TEXT[tier];
  const workOn = colorToWorkOn(summary);
  const color = workOn && COLORS.find((c) => c.name === workOn.name);
  const cap = (n) => n.charAt(0).toUpperCase() + n.slice(1);
  const recent = history.slice(-7);
  const best = history.reduce((m, r) => Math.max(m, r.total ? r.correct / r.total : 0), 0);
  const bestRound = history.find((r) => r.total && r.correct / r.total === best);
  const shortDay = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return SHORT_WEEKDAY.format(new Date(y, m - 1, d));
  };
  return (
    <>
      <div className="complete-wrap complete-wrap-compact">
        <ScoreCelebration tier={tier} />
        <h2 className="screen-title">{text.title}</h2>
        <p className="screen-sub">
          {correct} of {summary.total} right for {playerName}.{' '}
          {correct === summary.total ? 'Every chord right!' : text.sub}
        </p>
      </div>
      <StickerPicker playerId={playerId} signedIn={signedIn} from="pitch" onStick={onStick} onSignIn={onSignIn} then={then} />
      <div className="stat-tiles stat-tiles-compact">
        <div className="stat-tile">
          <div className="stat-number">{correct}</div>
          <div className="stat-label">Correct</div>
        </div>
        <div className="stat-tile">
          <div className="stat-number">{wrong}</div>
          <div className="stat-label">Wrong</div>
        </div>
        <div className="stat-tile">
          <div className="stat-number"><Icon name="flame" /> {streak.current}</div>
          <div className="stat-label">{streak.current === 1 ? 'Day' : 'Days'} in a row</div>
        </div>
      </div>
      {(() => {
        // Each of the player's colors: its percent right this round,
        // against the last round it was in. Lowest first, so what to
        // practice is on top; a color not in this round goes last.
        const before = (name) =>
          history
            .slice(0, -1)
            .reverse()
            .find((r) => r.colors?.[name]?.total)?.colors[name];
        const pct = (c) => Math.round((100 * c.right) / c.total);
        const names = [...new Set([...colorNames, ...Object.keys(summary.colors)])];
        const rows = names
          .map((name) => {
            const c = summary.colors[name];
            const was = before(name);
            return { name, c, now: c ? pct(c) : null, last: was ? pct(was) : null };
          })
          .sort(
            (x, y) =>
              (x.now ?? 101) - (y.now ?? 101) || LEARNING_ORDER.indexOf(x.name) - LEARNING_ORDER.indexOf(y.name),
          );
        return (
          <div className="colors-card" aria-label="Each color">
            <div className="colors-card-head">
              <b>Each color</b>
              <span>this round · last time</span>
            </div>
            {rows.map(({ name, c, now, last }) => {
              const color = COLORS.find((x) => x.name === name);
              const change = last == null || now == null ? null : now - last;
              return (
                <div key={name} className="colors-row">
                  <span className="colors-swatch" style={{ background: color?.hex }} aria-hidden="true" />
                  <span className="colors-name">{cap(name)}</span>
                  <span className="colors-track" aria-hidden="true">
                    <span
                      className={now >= 90 ? 'colors-fill-good' : now < 60 ? 'colors-fill-low' : ''}
                      style={{ width: `${now == null ? 0 : Math.max(4, now)}%` }}
                    />
                  </span>
                  <span className="colors-pct">
                    {now == null ? (
                      <small>not this round</small>
                    ) : (
                      <>
                        {now}%<small>{c.right}/{c.total}</small>
                      </>
                    )}
                  </span>
                  <span
                    className={`colors-change${change > 0 ? ' colors-up' : change < 0 ? ' colors-down' : ''}`}
                  >
                    {last == null ? (now == null ? '' : 'first time') : `${change > 0 ? '↑ ' : change < 0 ? '↓ ' : ''}was ${last}%`}
                  </span>
                </div>
              );
            })}
            <p className="colors-note">
              {color
                ? `Practice ${cap(color.name)} next${workOn.mixedWith ? ` (mixed up with ${cap(workOn.mixedWith)})` : ''}: try it in Explore.`
                : 'Every color right! 90% or more on another day too? Time to add a new color.'}
            </p>
          </div>
        );
      })()}
      {recent.length > 1 && (
        <div className="rounds-card" aria-label="Recent rounds">
          <div className="rounds-head">
            <span>Recent rounds</span>
            {bestRound && (
              <span className="rounds-best">
                Best: {bestRound.correct}/{bestRound.total}
              </span>
            )}
          </div>
          <div className="rounds-bars">
            {recent.map((r, i) => {
              const pct = r.total ? r.correct / r.total : 0;
              return (
                <div key={r.endedAt} className="rounds-bar" title={`${r.correct} of ${r.total}`}>
                  <span>{r.correct}</span>
                  <span className="rounds-track">
                    <span
                      className={`rounds-fill${pct >= 0.9 ? ' rounds-fill-good' : ''}${i === recent.length - 1 ? ' rounds-fill-now' : ''}`}
                      style={{ height: `${Math.max(8, pct * 100)}%` }}
                    />
                  </span>
                  <span className="rounds-label">{i === recent.length - 1 ? 'Now' : shortDay(r.day)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
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

  const [profiles, setProfiles] = useState(loadGuestProfiles);
  // Which list `profiles` currently is: 'guest' or 'account'.
  const [profileOwner, setProfileOwner] = useState('guest');
  // Edits on the settings screen stay in this draft until "Save" is tapped.
  const [draftProfiles, setDraftProfiles] = useState(profiles);
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  // False until the saved sign-in (if any) has been checked on load.
  const [authChecked, setAuthChecked] = useState(false);
  // Signed in on this device: a PitchPop loading screen until the
  // family's players are in, so the guest player never flashes first.
  // At most OPENING_MAX_MS (e.g. with no internet the cached players are
  // used), and at least OPENING_MIN_MS so it doesn't just flicker.
  const [opening, setOpening] = useState(() => !!rememberedAccount());
  useEffect(() => {
    if (!opening) return undefined;
    const started = performance.now();
    const cap = setTimeout(() => setOpening(false), OPENING_MAX_MS);
    let wait;
    if (authChecked) {
      wait = setTimeout(() => setOpening(false), Math.max(0, OPENING_MIN_MS - (performance.now() - started)));
    }
    return () => {
      clearTimeout(cap);
      clearTimeout(wait);
    };
  }, [opening, authChecked]);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  // Anonymous usage stats (stats.js): the app was opened.
  useEffect(() => {
    statAppOpened();
  }, []);
  // The stats page is only for the accounts allowed to see it.
  const [statsViewer, setStatsViewer] = useState(false);
  useEffect(() => {
    let live = true;
    if (cloudUser?.id) canViewStats().then((ok) => live && setStatsViewer(ok));
    else setStatsViewer(false);
    return () => {
      live = false;
    };
  }, [cloudUser?.id]);
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem(WELCOME_KEY) !== '1');

  const [profile, setProfile] = useState(profiles[0].id);
  const [lastActiveProfile, setLastActiveProfile] = useState(initialSession.lastActiveProfile || profiles[0].id);
  const [progress, setProgress] = useState(loadProgress);
  const [streakDays, setStreakDays] = useState(loadStreakDays);
  // The color picked in a wrong answer, for "listen to both".
  // This chord's wrong taps: the colors ruled out (shown faded), and
  // whether the right one is now being shown (after two misses, or one in
  // a two-color mix-up check).
  const [tries, setTries] = useState(NO_TRIES);

  const currentProfile = profiles.find((p) => p.id === profile) || profiles[0];
  // What the daily reminder and the Sunday summary say (reminders.js).
  function reminderPlayers() {
    if (!cloudUser) return [];
    const history = loadRoundHistory();
    return profiles.map((p) => {
      const days = streakDays[p.id] || [];
      const week = weekProgress(history[p.id] || [], days, p.colors);
      return {
        name: p.name,
        streak: week.streak,
        practicedToday: days.includes(dayKey()),
        week: { rounds: week.roundsThisWeek, pctRight: week.pctRight },
      };
    });
  }
  const reminderPlayersRef = useRef(reminderPlayers);
  reminderPlayersRef.current = reminderPlayers;
  // Kept current: on opening, when players change and after each round.
  useEffect(() => {
    scheduleReminders(reminderPlayersRef.current());
  }, [cloudUser, profiles, streakDays]);


  // Tiny Tots shows the player's colors, in the order they learned them.
  const totsColors = (currentProfile.colors || []).map((n) => COLORS.find((c) => c.name === n)).filter(Boolean);
  const lastProfile = profiles.find((p) => p.id === lastActiveProfile) || profiles[0];
  // Without PitchPop Family, Pitch Practice plays the first few colors.
  const planOK = hasPlan(cloudUser);
  // The voice speaks in whoever is playing's language.
  setSpeechLanguage(voiceLang(profile));
  const profileColorNames = planOK ? currentProfile.colors : currentProfile.colors.slice(0, FREE_COLORS);
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
  // A round saved when rounds had a different length starts over.
  const lengthMismatch = initialSession.sessionQueue && initialSession.sessionQueue.length !== SESSION_ROUNDS;
  const resumableSession = profileMismatch || lengthMismatch ? {} : initialSession;

  // PitchPop always opens on the home page, which shows every part of the
  // app. (A first visit also gets the welcome card on top of it.)
  const [view, setView] = useState('home');
  // Single notes players: Part 2's score ({ correct, total }), shown with
  // the round's results.
  const [part2, setPart2] = useState(null);
  // Whether the Single notes screen is Part 2 (after the chords) or a whole
  // round of its own (black-key chords only).
  const [notesPart, setNotesPart] = useState(true);
  // A color this player hasn't met yet (just added in Players & colors):
  // on the home page, it's introduced chord first (NewColor.jsx).
  const [newColorName, setNewColorName] = useState(null);
  const colorKey = profileColorNames.join(',');
  useEffect(() => {
    setNewColorName(view === 'home' && cloudUser ? newColorFor(profile, profileColorNames) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, profile, colorKey, cloudUser]);
  // Swipe back / the browser's back button go to the previous screen.
  useScreenHistory(view, setView);
  const [preExploreView, setPreExploreView] = useState('home');
  const [preToolView, setPreToolView] = useState('home');
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
  // What was picked first when a chord's first answer was wrong, by round
  // index (for "what to work on").
  const [roundMixups, setRoundMixups] = useState(resumableSession.roundMixups || {});
  // The color this round focuses on, from the player's recent mistakes
  // (smartRound.js), or null: { name, partner }.
  // A sticker just picked on the "All done!" screen, to stick in the book.
  const [placingSticker, setPlacingSticker] = useState(null);
  // Music Theory's tab: the glossary, or the quiz when opened from the plan.
  const [theoryMode, setTheoryMode] = useState('glossary');
  const [stickerBackTo, setStickerBackTo] = useState(null);
  const [planReason, setPlanReason] = useState(null);
  // The home page's End practice: Practice Mode opens and ends it.
  const [endPracticeOnOpen, setEndPracticeOnOpen] = useState(false);
  const [roundFocus, setRoundFocus] = useState(resumableSession.roundFocus || null);

  const [melodyTaps, setMelodyTaps] = useState(initialSession.melodyTaps || 0);
  const [melodyColorCounts, setMelodyColorCounts] = useState(initialSession.melodyColorCounts || {});

  const [justPlayed, setJustPlayed] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  useEffect(() => {
    engineRef.current.prewarm(COLORS.map((c) => c.notes));
    // The talking voice (a large download and a lot of work for the phone)
    // gets ready when a screen that talks opens - Pitch Practice, Explore,
    // NoteSpeller - not at startup, where it made the first taps slow.

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
      newRound(list[0].id, list[0].colors);
      setRoundIndex(0);
      setTries(NO_TRIES);
      setOptions([]);
      setRoundResults({});
      setRoundOutcomes({});
    setRoundMixups({});
      setView((v) => (inPitchPractice(v) ? playViewFor(list[0].id) : v));
      return list[0].id;
    });
  }

  // Signed in on load: show the family account's players (or the copy
  // cached on this device if the account can't be reached right now).
  // Bumped on every sign-in and sign-out, so a slow check started before
  // (e.g. with no internet) can't undo it when it finally answers.
  const authEpoch = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const epoch = authEpoch.current;
    // Show the family signed in at once, from this device (works with no
    // internet); the server check below can take a while offline.
    const remembered = rememberedAccount();
    const cachedAtStart = remembered && loadPreAccountProfiles();
    if (remembered) {
      setCloudUser(remembered);
      if (cachedAtStart) showProfiles(cachedAtStart, 'account');
    }
    Promise.all([getUser(), loadCloudProfiles()])
      .then(([user, cloudProfiles]) => {
        if (cancelled || epoch !== authEpoch.current) return;
        if (!user) {
          // Signed out elsewhere (or the account was deleted).
          if (remembered) {
            setCloudUser(null);
            showProfiles(loadGuestProfiles(), 'guest');
          }
          return;
        }
        setCloudUser(user);
        if (cloudProfiles?.length) {
          showProfiles(cloudProfiles, 'account');
          setCloudConnected(true);
        } else {
          const cached = loadPreAccountProfiles();
          if (cached) showProfiles(cached, 'account');
        }
      })
      .catch((err) => console.error('PitchPop is using local profile settings', err))
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Signed in, each player's practice history and game streak sync with
  // the family account (historySync.js); show what other phones added.
  // Offline it tries again when the internet comes back.
  const syncedProfileIds = cloudUser && profileOwner === 'account' ? profiles.map((p) => p.id).join(',') : '';

  // Signed in but opened without internet: the players cached on this
  // device are shown. When the internet comes back (or the app returns to
  // the front), send any changes made offline and show the account's
  // latest players - unless the family is in the middle of editing them.
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    if (!cloudUser) return undefined;
    let busy = false;
    const reconnect = async () => {
      if (busy || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
      busy = true;
      const epoch = authEpoch.current;
      const cloudProfiles = await loadCloudProfiles();
      busy = false;
      if (!cloudProfiles?.length || viewRef.current === 'settings' || epoch !== authEpoch.current) return;
      showProfiles(cloudProfiles, 'account');
      setCloudConnected(true);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') reconnect();
    };
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cloudUser]);
  useEffect(() => {
    if (!syncedProfileIds) return undefined;
    return startHistorySync(syncedProfileIds.split(','));
  }, [syncedProfileIds]);
  useEffect(() => {
    const reload = () => setStreakDays(loadStreakDays());
    window.addEventListener('pitchpop-history-synced', reload);
    return () => window.removeEventListener('pitchpop-history-synced', reload);
  }, []);
  // One practice per player across the family's phones (livePractice.js).
  const profileRef = useRef(profile);
  profileRef.current = profile;
  useEffect(() => {
    if (!syncedProfileIds) return undefined;
    return startLivePractice(() => [profileRef.current]);
  }, [syncedProfileIds]);
  // PitchPop Family: checked with the App Store for the family account.
  useEffect(() => {
    if (authChecked) startPlans(cloudUser);
  }, [authChecked, cloudUser?.id]);
  // Settings synced from another phone, a practice starting or moving on
  // one, or the plan changing: show them.
  const [, setSyncTick] = useState(0);
  useEffect(() => {
    const bump = () => setSyncTick((t) => t + 1);
    window.addEventListener('pitchpop-plan-changed', bump);
    window.addEventListener('pitchpop-live-changed', bump);
    window.addEventListener('pitchpop-history-synced', bump);
    return () => {
      window.removeEventListener('pitchpop-plan-changed', bump);
      window.removeEventListener('pitchpop-live-changed', bump);
      window.removeEventListener('pitchpop-history-synced', bump);
    };
  }, []);

  // Guests see everything, but only signed-in families keep records
  // (streaks, rounds, practice time).
  setKeepRecords(!!cloudUser);

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

  // In the iPhone app: an account email's link, handed over by the website
  // (appLink.js), signs the family in here. A password-reset link goes to
  // "choose a new password".
  const handleSignedInRef = useRef(null);
  handleSignedInRef.current = (user) => handleSignedIn(user);
  useEffect(
    () =>
      listenForAppLinks(async ({ accessToken, refreshToken, recovery }) => {
        const user = await signInFromLink(accessToken, refreshToken);
        if (!user) return;
        if (recovery) {
          authEpoch.current += 1;
          setCloudUser(user);
          setPasswordRecovery(true);
          setView('account');
        } else {
          handleSignedInRef.current(user);
        }
      }),
    [],
  );

  useEffect(() => {
    saveSession({
      view,
      profile,
      lastActiveProfile,
      sessionQueue,
      roundFocus,
      roundIndex,
      optionNames: options.map((c) => c.name),
      answerCorrect,
      roundResults,
      roundOutcomes,
      roundMixups,
      melodyTaps,
      melodyColorCounts,
    });
  }, [
    view,
    profile,
    lastActiveProfile,
    sessionQueue,
    roundFocus,
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
    newSound();
    speakResults(correct, SESSION_ROUNDS);
  }, [view]);

  const currentColor = sessionQueue.length ? COLORS.find((c) => c.name === sessionQueue[roundIndex]) : null;

  // Each new sound replaces whatever is still playing (see soundBus.js).
  function playChord(color) {
    newSound();
    engineRef.current.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  // Says the color name, then plays its real notes one at a time right
  // after - so "Blue" is followed by the actual B, D, G pitches instead of
  // a voice just naming letters with no real connection to the chord.
  // `soundId` ties the steps together: if anything else starts playing
  // meanwhile, the notes don't follow.
  async function announceColor(color, soundId) {
    await speakColorName(color.name);
    if (!isCurrent(soundId)) return;
    engineRef.current.playNoteSequence(color.notes);
  }

  // keepPractice: switching *to* the player whose practice is on (see
  // resumePractice), so the timer keeps going.
  // Where a player's Pitch Practice is: the color game, or Tiny Tots.
  function playViewFor(profileId) {
    if (inTinyTots(profileId)) {
      setPreToolView('home');
      return 'tinytots';
    }
    return 'play-listen';
  }
  function inPitchPractice(v) {
    return v.startsWith('play-') || v === 'tinytots' || v === 'singlenotes';
  }

  // Whatever way a Tiny Tots player reaches the color game (Back, a link,
  // the widget...), it's Tiny Tots for them.
  useEffect(() => {
    if (view.startsWith('play-') && inTinyTots(profile)) setView(playViewFor(profile));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, profile]);

  function changeProfile(next, keepPractice = false) {
    if (profile !== 'melody') setLastActiveProfile(profile);
    if (next !== profile) {
      // The practice timer belongs to the player who started it.
      if (!keepPractice) stopPractice();
      // A quiz round in progress is built from the outgoing profile's
      // color set - switching identity mid-round let colors outside the
      // new profile's palette (e.g. Maddie's "brown") leak into Marcus's
      // answer options. Reset to a clean state for whoever's playing now,
      // but stay on the play screen instead of bouncing to home if a
      // round was already in progress.
      newRound(next, colorsFor(next));
      setRoundIndex(0);
      setTries(NO_TRIES);
      setOptions([]);
      setRoundResults({});
      setRoundOutcomes({});
    setRoundMixups({});
      setView(inPitchPractice(view) ? playViewFor(next) : view);
    }
    setProfile(next);
  }

  function goHome() {
    newSound();
    setView('home');
  }

  // A new round's 20 chords: a smart round (more of the colors this
  // player missed lately) unless they're switched to plain rounds.
  function newRound(profileId, allColorNames) {
    const colorNames = hasPlan(cloudUser) ? allColorNames : allColorNames.slice(0, FREE_COLORS);
    const round = buildSmartRound(profileId, colorNames, SESSION_ROUNDS, buildQueue);
    setSessionQueue(round.queue);
    setRoundFocus(round.focus);
  }

  function startPlay() {
    prewarmVoices();
    // Tiny Tots players get big colors to tap instead of the game.
    if (inTinyTots(profile)) {
      openTool('tinytots');
      return;
    }
    // Single notes, black-key chords only: one round of white-key notes
    // with the black-key colors as chords.
    if (inSingleNotes(profile) && singleNotesStyle(profile) === 'black') {
      setPart2(null);
      setNotesPart(false);
      openTool('singlenotes');
      return;
    }
    newRound(profile, profileColorNames);
    setPart2(null);
    setRoundIndex(0);
    setTries(NO_TRIES);
    setRoundResults({});
    setRoundOutcomes({});
    setRoundMixups({});
    setView('play-listen');
  }

  // Explore is reachable from the "Playing as" dropdown on every screen,
  // including mid-quiz - closing it should return to wherever the player
  // actually was, not reset their progress.
  function openExplore() {
    prewarmVoices();
    // Opening Explore from Explore must not make Explore its own way back.
    if (view === 'explore') return;
    setPreExploreView(view);
    setView('explore');
  }

  function closeExplore() {
    setView(preExploreView);
  }

  // A chord's answer buttons: all the player's colors, or just two in a
  // mix-up check.
  function optionsFor(index, name) {
    return buildOptions(checkPairFor(roundFocus, index, name) || profileColorNames);
  }

  function listenTap() {
    playChord(currentColor);
    setOptions(optionsFor(roundIndex, currentColor.name));
    setView('play-question');
  }

  function relistenTap() {
    playChord(currentColor);
  }

  function chooseAnswer(color) {
    const correct = color.name === currentColor.name;
    // Tapping the color being shown: nothing new to count.
    if (correct && tries.reveal) {
      setAnswerCorrect(true);
      const soundId = newSound();
      playCorrectChime();
      later(() => announceColor(currentColor, soundId), 350);
      setView('play-feedback');
      return;
    }

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
    // Missed on the first try: in a smart round, it comes back a few
    // chords later.
    if (!correct && !(roundIndex in roundOutcomes)) {
      setSessionQueue((q) => comebackQueue(q, roundIndex, currentColor.name, roundFocus));
    }
    if (!correct) setRoundMixups((prev) => (roundIndex in prev ? prev : { ...prev, [roundIndex]: color.name }));

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

    const soundId = newSound();
    if (correct) {
      setAnswerCorrect(true);
      playCorrectChime();
      later(() => announceColor(currentColor, soundId), 350);
      setView('play-feedback');
      return;
    }
    // Wrong: no guessing again. The other colors fade, the right one
    // glows while its chord plays with its name, and they tap it to
    // remember it. (It then comes back later in the round to drill it;
    // see comebackQueue.)
    playWrongBuzz();
    setTries({ out: [color.name], reveal: true });
    later(() => announceColor(currentColor, soundId), 600);
  }

  function hearAgainFromFeedback() {
    playChord(currentColor);
    setView('play-relisten');
  }

  function chooseDifferentAnswer() {
    newSound();
    setView('play-question');
  }

  function nextChord() {
    newSound();
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      // Every finished round earns a sticker (picked on the "All done!"
      // screen).
      setStreakDays(recordStreakDay(streakDays, profile));
      earnSticker(profile);
      recordRound(profile, summarizeRound(sessionQueue, roundOutcomes, roundMixups, roundFocus));
      statRoundDone({
        activity: inTinyTots(profile) ? 'tots' : 'color-test',
        lang: speechLanguage(),
        correct: Object.values(roundOutcomes).filter(Boolean).length,
        total: SESSION_ROUNDS,
      });
      // Single notes players go on to Part 2: 10 notes on the keyboard.
      if (inSingleNotes(profile)) {
        setPart2(null);
        setNotesPart(true);
        setPreToolView('home');
        setView('singlenotes');
        return;
      }
      setView('play-complete');
      return;
    }
    // The next chord plays by itself (tapping Next is the cue), straight
    // to its question; the rainbow there plays it again. Only a round's
    // first chord waits for a tap on the rainbow.
    const nextColor = COLORS.find((c) => c.name === sessionQueue[roundIndex + 1]);
    setRoundIndex((r) => r + 1);
    setTries(NO_TRIES);
    if (!nextColor) {
      setView('play-listen');
      return;
    }
    setOptions(optionsFor(roundIndex + 1, nextColor.name));
    setView('play-question');
    later(() => playChord(nextColor), 300);
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
    prewarmVoices();
    if (!hasPlan(cloudUser)) return openPlan('NoteSpeller is part of PitchPop Family');
    setView('notespeller');
  }

  // Piano, Practice Mode and Music Theory are side trips like Explore:
  // closing one goes back to wherever the player was (a quiz in progress
  // included) instead of restarting the color game.
  const TOOL_VIEWS = ['piano', 'practice', 'theory', 'method', 'scales', 'hanon', 'tinytots', 'singlenotes', 'progress', 'stickers', 'plan'];

  // The header's practice pill, on every screen: back to the timer (in
  // Practice Mode itself, to its Timer tab).
  const openPracticeFromBadge = () => {
    showTimerTab();
    if (view === 'practice') window.dispatchEvent(new Event('pitchpop-show-timer'));
    else openTool('practice');
  };

  // The screen PitchPop was on when it went into the background, saved
  // then so it can come back to it (Scales, Hanon...) even if the iPhone
  // closed the app while it was away.
  const saveScreen = () => {
    try {
      localStorage.setItem(LAST_TOOL_KEY, viewRef.current);
    } catch {
      /* storage unavailable */
    }
  };

  // Opening PitchPop, or coming back to it from another app, while a
  // practice is on: that player, on the screen they had open if it was one
  // of the piano tools (Scales, Hanon, Piano, the timer...), otherwise the
  // practice timer. (Signed in, once the family's players have loaded.)
  const resumePracticeRef = useRef(null);
  resumePracticeRef.current = (fresh) => {
    const timer = readPracticeTimer();
    if (timer.status !== 'running' && timer.status !== 'paused') return;
    if (timer.profileId && timer.profileId !== profile && profiles.some((p) => p.id === timer.profileId)) {
      changeProfile(timer.profileId, true);
    }
    // Back from another app with PitchPop still open: it's still on the
    // tool it was on.
    if (!fresh && TOOL_VIEWS.includes(view)) return;
    let lastTool = null;
    try {
      lastTool = localStorage.getItem(LAST_TOOL_KEY);
    } catch {
      /* storage unavailable */
    }
    if (fresh && lastTool && lastTool !== 'practice' && TOOL_VIEWS.includes(lastTool)) openTool(lastTool);
    else openPracticeFromBadge();
  };
  useEffect(() => {
    if (opening) return undefined;
    resumePracticeRef.current(true);
    const onVisible = () => {
      if (document.hidden) saveScreen();
      else resumePracticeRef.current(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', saveScreen);
    // The iPhone app also says so directly when it comes to the front.
    const appState = Capacitor.isNativePlatform()
      ? CapacitorApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) resumePracticeRef.current(false);
          else saveScreen();
        })
      : null;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', saveScreen);
      appState?.then((handle) => handle.remove());
    };
  }, [opening]);

  // A Lock Screen widget tapped: straight to the color game or the
  // practice timer. Handled a moment after the app comes to the front (and
  // after the loading screen), so it wins over the practice-resume above.
  const [widgetOpen, setWidgetOpen] = useState(null);
  useEffect(() => listenForWidgetLinks((target) => setTimeout(() => setWidgetOpen({ target }), 400)), []);
  const openFromWidgetRef = useRef(null);
  openFromWidgetRef.current = (target) => {
    if (target === 'practice') openPracticeFromBadge();
    else if (!view.startsWith('play-')) startPlay();
  };
  useEffect(() => {
    if (opening || !widgetOpen) return;
    openFromWidgetRef.current(widgetOpen.target);
    setWidgetOpen(null);
  }, [opening, widgetOpen]);

  function openTool(id) {
    newSound();
    // Already in a color test: keep the round going rather than restart it.
    if (id === 'home') return goHome();
    if (id === 'color-test') return view.startsWith('play-') ? undefined : startPlay();
    if (id === 'explore') return openExplore();
    if (id === 'notespeller') return openNoteSpeller();
    if (id === 'plan') return openPlan();
    if (id === 'theory') setTheoryMode('glossary');
    if (PAID_VIEWS.includes(id) && !hasPlan(cloudUser)) return openPlan();
    if (!TOOL_VIEWS.includes(view)) setPreToolView(view);
    setView(id);
  }

  // The PitchPop Family page, with what led there (a locked feature).
  function openPlan(reason = null) {
    setPlanReason(reason);
    if (!TOOL_VIEWS.includes(view)) setPreToolView(view);
    setView('plan');
  }

  // A sticker just picked after an activity: open the book to stick it
  // in, and come back to the activity after.
  function openStickerBookWith(index) {
    setPlacingSticker(index);
    setStickerBackTo(view);
    openTool('stickers');
  }

  // The sticker picker shown when an activity is finished.
  // Today's practice item to open.
  const openPlanItem = (id) => {
    if (id === 'color-test' || id === 'tots') return startPlay();
    openTool(id);
    // From the plan, Music Theory opens on its quiz.
    if (id === 'theory') setTheoryMode('quiz');
  };

  // After finishing something: the next thing on today's list (not `doneId`),
  // or home when the list is all done.
  const NEXT_LABELS = {
    'color-test': 'Pitch Practice',
    tots: 'Tiny Tots',
    notespeller: 'NoteSpeller',
    theory: 'Theory quiz',
    practice: 'Piano practice',
  };
  const nextUpButton = (doneId) => {
    const next = todayPlan({
      playerId: profile,
      rounds: loadRoundHistory()[profile] || [],
      practices: loadPracticeLog()[profile] || [],
      colorNames: profileColorNames,
      tinyTots: inTinyTots(profile),
      singleNotes: inSingleNotes(profile) && singleNotesStyle(profile),
    }).find((item) => !item.done && item.id !== doneId);
    return next ? (
      <button className="pill-btn-primary pill-btn-full next-up" onClick={() => openPlanItem(next.id)}>
        <Icon name={next.icon} /> Next: {(inSingleNotes(profile) && next.id === 'color-test' && next.title) || NEXT_LABELS[next.id] || next.title} →
      </button>
    ) : (
      <button className="pill-btn-primary pill-btn-full next-up" onClick={goHome}>
        <Icon name="home" /> All done today!
      </button>
    );
  };

  // The sticker picker for a done screen; `then` (Play again...) shows
  // once the sticker is in.
  const stickerPicker = (from) => (then) => (
    <StickerPicker
      playerId={profile}
      signedIn={!!cloudUser}
      from={from}
      onStick={openStickerBookWith}
      onSignIn={openAccount}
      then={then}
    />
  );

  function closeTool() {
    setPlacingSticker(null);
    setEndPracticeOnOpen(false);
    if (view === 'stickers' && stickerBackTo) {
      setStickerBackTo(null);
      setView(stickerBackTo);
      return;
    }
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
    // Signed in: saved to the account now, or as soon as it's back online.
    if (cloudUser) {
      draftProfiles.forEach(saveCloudProfile);
      profiles.filter((p) => !keptIds.has(p.id)).forEach((p) => deleteCloudProfile(p.id));
    }
    // Back to the home page. The next color test starts fresh, built from
    // the saved colors of whoever is playing (they may just have changed).
    const player = draftProfiles.find((p) => p.id === profile) || draftProfiles[0];
    setProfile(player.id);
    newRound(player.id, player.colors);
    setRoundIndex(0);
    setTries(NO_TRIES);
    setOptions([]);
    setRoundResults({});
    setRoundOutcomes({});
    setRoundMixups({});
    goHome();
  }

  async function handleSignedIn(user) {
    authEpoch.current += 1;
    setCloudUser(user);
    if (!user) {
      // Signing out ends any practice that's on (saved if long enough).
      stopPractice();
      setCloudConnected(false);
      // The account's players leave this phone with it.
      try {
        localStorage.removeItem(PROFILES_KEY);
      } catch {
        /* ignore */
      }
      showProfiles(loadGuestProfiles(), 'guest');
      return;
    }
    const cloudProfiles = await loadCloudProfiles();
    if (!cloudProfiles) return;
    // A brand-new family account starts with just the guest player,
    // renamed "Player 1" for the family to rename - never players another
    // account left on this phone.
    const guests = loadGuestProfiles().map((p) => ({ ...p, name: 'Player 1' }));
    const next = cloudProfiles.length ? cloudProfiles : guests;
    showProfiles(next, 'account');
    setCloudConnected(true);
    if (!cloudProfiles.length) next.forEach(saveCloudProfile);

    // A fresh color test for the selected player (or the account's first
    // player). The app opening already signed in stays where it is (the
    // main page); signing in from the account screen goes to the main page.
    const player = next.find((p) => p.id === profile) || next[0];
    setProfile(player.id);
    newRound(player.id, player.colors);
    setRoundIndex(0);
    setTries(NO_TRIES);
    setOptions([]);
    setRoundResults({});
    setRoundOutcomes({});
    setRoundMixups({});
    setView((v) => (v === 'account' ? 'home' : v.startsWith('play-') ? 'play-listen' : v));
  }

  // Deleting the account also wipes its players from this device, so the
  // app starts over with one fresh generic player.
  function handleAccountDeleted() {
    authEpoch.current += 1;
    stopPractice();
    PLAYER_DATA_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    setCloudUser(null);
    setCloudConnected(false);
    setProgress({});
    setStreakDays({});
    showProfiles(DEFAULT_PROFILES, 'guest');
  }

  function addPlayer(rawName) {
    const name = rawName.trim();
    if (!name || !cloudUser) return;
    if (draftProfiles.length >= 1 && !hasPlan(cloudUser)) {
      openPlan('More players come with PitchPop Family');
      return;
    }
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

  if (opening) {
    return (
      <div className="opening" role="status" aria-label="PitchPop is opening">
        <img className="opening-mark" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
        <span className="logo opening-word">
          <LogoWord />
        </span>
        <span className="opening-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    );
  }

  // PitchPop needs a family account: before anything else, sign up (or
  // sign in) with email. (A password reset link goes to the account screen.)
  if (!cloudUser && !passwordRecovery) {
    return (
      <div className="page">
        <div className="app signup-gate">
          <div className="signup-gate-logo">
            <img className="opening-mark" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
            <span className="logo opening-word">
              <LogoWord />
            </span>
          </div>
          <p className="signup-gate-sub">Every chord has a color. Make your family account to start playing.</p>
          <AccountScreen
            user={null}
            playerCount={profiles.length}
            onSignedIn={handleSignedIn}
            onAccountDeleted={handleAccountDeleted}
            onOpenPlayers={openSettings}
            startMode="sign-up"
          />
        </div>
      </div>
    );
  }

  if (view === 'stats') {
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
            onOpenPractice={openPracticeFromBadge}
            showBack
            onBack={openAccount}
          />
          <h2 className="screen-title">PitchPop stats</h2>
          <StatsScreen />
        </div>
      </div>
    );
  }

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
            onOpenPractice={openPracticeFromBadge}
            showBack
            onBack={goHome}
          />
          <h2 className="screen-title">Account</h2>
          <AccountScreen
            user={cloudUser}
            playerCount={profiles.length}
            onSignedIn={handleSignedIn}
            onAccountDeleted={handleAccountDeleted}
            onOpenPlayers={openSettings}
            onOpenStats={statsViewer ? () => setView('stats') : null}
            recoveryMode={passwordRecovery}
            onPasswordUpdated={() => setPasswordRecovery(false)}
          />
        </div>
      </div>
    );
  }

  if (view === 'notespeller') {
    return (
      <div className="page page-fit">
        <div className="app app-fit">
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            onOpenPractice={openPracticeFromBadge}
            showBack
            onBack={goHome}
          />
          <NoteSpeller
            key={profile}
            engine={engineRef.current}
            playerId={profile}
            onComplete={(correct, total) => {
              setStreakDays(recordStreakDay(streakDays, profile));
              earnSticker(profile);
              statRoundDone({ activity: 'notespeller', lang: speechLanguage(), correct, total });
            }}
            stickerSlot={stickerPicker('notes')}
          />
        </div>
      </div>
    );
  }

  if (view === 'piano') {
    return <Piano engine={engineRef.current} onClose={closeTool} />;
  }

  if (view === 'practice' || view === 'theory' || view === 'method' || view === 'scales' || view === 'hanon' || view === 'tinytots' || view === 'singlenotes' || view === 'progress' || view === 'stickers' || view === 'plan') {
    // Practice Mode fits on one screen (its tools are tabs); the Music
    // Theory glossary and the method explanation are reading pages and
    // scroll.
    const fit = view === 'practice';
    return (
      <div className={fit ? 'page page-fit' : 'page'}>
        <div className={fit ? 'app app-fit' : 'app'}>
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            onOpenPractice={openPracticeFromBadge}
            showBack
            onBack={closeTool}
          />
          {view === 'practice' ? (
            <PracticeMode
              engine={engineRef.current}
              profileId={currentProfile.id}
              profileName={currentProfile.name}
              ready={authChecked}
              onSaved={(id) => {
                earnSticker(id);
                statRoundDone({ activity: 'practice', lang: speechLanguage() });
              }}
              endOnOpen={endPracticeOnOpen}
              onEndHandled={() => setEndPracticeOnOpen(false)}
              stickerSlot={stickerPicker('practice')}
              next={nextUpButton('practice')}
            />
          ) : view === 'scales' ? (
            <Scales engine={engineRef.current} />
          ) : view === 'hanon' ? (
            <Hanon engine={engineRef.current} />
          ) : view === 'method' ? (
            <MethodInfo colors={COLORS} />
          ) : view === 'progress' ? (
            <Progress
              player={currentProfile}
              rounds={loadRoundHistory()[profile] || []}
              days={streakDays[profile] || []}
              colors={COLORS}
              signedIn={!!cloudUser}
              onSignIn={openAccount}
              reminderPlayers={reminderPlayers}
              onOpenStickers={() => openTool('stickers')}
            />
          ) : view === 'plan' ? (
            <Paywall user={cloudUser} reason={planReason} onSignIn={openAccount} onDone={closeTool} />
          ) : view === 'stickers' ? (
            <StickerBook
              key={profile}
              player={currentProfile}
              signedIn={!!cloudUser}
              onSignIn={openAccount}
              placing={placingSticker}
              onPlaced={() => setPlacingSticker(null)}
              next={nextUpButton()}
            />
          ) : view === 'singlenotes' && !notesPart ? (
            // A whole round: white keys as notes, black-key colors as chords.
            <SingleNotes
              key={`${profile}-round`}
              engine={engineRef.current}
              rainbowColors={COLORS}
              chordColors={totsColors.filter(usesBlackKeys)}
              answerColors={totsColors}
              onComplete={(correct, total) => {
                setStreakDays(recordStreakDay(streakDays, profile));
                earnSticker(profile);
                markDoneToday(profile, 'color-test');
                statRoundDone({ activity: 'single-notes', lang: speechLanguage(), correct, total });
              }}
              stickerSlot={stickerPicker('pitch')}
            />
          ) : view === 'singlenotes' ? (
            <SingleNotes
              key={profile}
              engine={engineRef.current}
              rounds={10}
              part="Part 2 · Single notes"
              rainbowColors={COLORS}
              onComplete={(correct, total) => {
                markDoneToday(profile, 'color-test');
                statRoundDone({ activity: 'single-notes', lang: speechLanguage(), correct, total });
                setPart2({ correct, total });
                // Then the round's results and sticker, with Part 2's score.
                setView('play-complete');
              }}
            />
          ) : view === 'tinytots' ? (
            <TinyTots
              key={profile}
              colors={totsColors}
              engine={engineRef.current}
              onComplete={() => {
                setStreakDays(recordStreakDay(streakDays, profile));
                earnSticker(profile);
                markDoneToday(profile, 'tots');
                statRoundDone({ activity: 'tots', lang: speechLanguage() });
              }}
              stickerSlot={stickerPicker('tots')}
            />
          ) : (
            <MusicTheory
              key={`${profile}-${theoryMode}`}
              startMode={theoryMode}
              onComplete={(correct, total) => {
                setStreakDays(recordStreakDay(streakDays, profile));
                markDoneToday(profile, 'theory');
                earnSticker(profile);
                statRoundDone({ activity: 'theory', lang: speechLanguage(), correct, total });
              }}
              stickerSlot={stickerPicker('theory')}
            />
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
            onOpenPractice={openPracticeFromBadge}
            showBack
            onBack={goHome}
          />
          <h2 className="screen-title">Players &amp; colors</h2>
          <p className="screen-sub">Each player starts with Red, Yellow and Blue, then adds one color at a time.</p>
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
                playDays={cloudUser ? streakDays[p.id] : null}
                onSignIn={cloudUser ? null : openAccount}
                freeColors={planOK ? null : FREE_COLORS}
                onLocked={() => openPlan('More colors come with PitchPop Family')}
              />
            ))}
          </div>
          {/* Guests have one player; more players, and records, need an
              account. */}
          {cloudUser ? (
            <AddPlayerForm onAdd={addPlayer} />
          ) : (
            <div className="guest-note">
              <p>You need an account to keep more players and settings, and to record history.</p>
              <button className="pill-btn-secondary" onClick={openAccount}>
                Sign in or create account
              </button>
            </div>
          )}
          <button className="pill-btn-primary pill-btn-full" onClick={saveSettings}>
            Save players &amp; colors
          </button>
          <button className="back-link back-link-center" onClick={goHome}>
            Cancel
          </button>
          {/* Less used: the step-by-step guide and the sound test. */}
          <LearningGuide />
          <SoundTest />
        </div>
      </div>
    );
  }

  if (profile === 'melody') {
    const melodyDone = melodyTaps >= MELODY_SESSION_TAPS;
    // The color buttons fit on one phone screen, no scrolling: they share
    // the height left under the header.
    const fitClass = melodyDone ? '' : ' melody-fit';
    return (
    <div className={fitClass ? 'page page-fit' : 'page'}>
      <div className={`app${fitClass ? ' app-fit' : ''}${fitClass}`}>
          <AppHeader
            profile={profile}
            profiles={profiles}
            onChangeProfile={changeProfile}
            onOpenSettings={openSettings}
            user={cloudUser}
            onOpenAccount={openAccount}
            onOpenTool={openTool}
            onOpenPractice={openPracticeFromBadge}
            showBack
            onBack={() => changeProfile(lastProfile.id)}
          />
          {melodyDone ? (
            <div className="complete-wrap">
              <div className="complete-emoji"><Icon name="sparkle" /></div>
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

  // The home page, Explore and the question screen fit on one phone
  // screen, no scrolling.
  const fitClass =
    view === 'home'
      ? ' home-fit'
      : view === 'explore'
        ? ' explore-fit'
        : view === 'play-question'
          ? ' question-fit'
          : '';
  return (
    <div className={fitClass ? `page page-fit${view === 'home' ? ' page-home' : ''}` : 'page'}>
      <div className={`app${fitClass ? ' app-fit' : ''}${fitClass}`}>
        {view === 'home' && (
          <>
            <AppHeader
              profile={profile}
              profiles={profiles}
              onChangeProfile={changeProfile}
              onOpenSettings={openSettings}
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
              onOpenPractice={openPracticeFromBadge}
            />
            <section className="home-hero">
              {/* The player's newest stickers (or a few to start with)
                  decorate the greeting. */}
              {(() => {
                const mine = cloudUser ? playerStickers(profile).slice(-4).map((s) => s.index) : [];
                const pick = (name) => STICKERS.findIndex(([n]) => n === name);
                const shown = mine.length >= 2 ? mine : [pick('Star'), pick('Music notes'), pick('Heart'), pick('Balloon')];
                return shown.slice(0, 4).map((index, i) => (
                  <span key={`${index}-${i}`} className={`home-hero-sticker home-hero-sticker-${i}`} aria-hidden="true">
                    <Sticker index={index} size={44} />
                  </span>
                ));
              })()}
              <div className="home-hero-rainbow">
                <Rainbow colors={COLORS} activeName={null} visible pretty />
              </div>
              <h2 className="home-hello">
                {cloudUser ? `Hi, ${currentProfile.name}!` : 'Every chord has a color'}
              </h2>
              {/* Today's steps and the one big button for what's next. */}
              <TodayPlan
                key={profile}
                steps
                playerId={profile}
                signedIn={!!cloudUser}
                colorNames={profileColorNames}
                tinyTots={inTinyTots(profile)}
                singleNotes={inSingleNotes(profile) && singleNotesStyle(profile)}
                lockedIds={planOK ? [] : PAID_VIEWS}
                onOpen={openPlanItem}
                onSignIn={openAccount}
              />
            </section>

            {/* One tap to start the practice timer. (During a practice the
                header's timer pill takes you back to it instead.) */}
            <div className="home-hero-actions home-quick">
              {!['running', 'paused'].includes(readPracticeTimer().status) && practiceElsewhere(profile) ? (
                <button className="home-practice home-practice-away" onClick={openPracticeFromBadge}>
                  <span className="home-practice-icon" aria-hidden="true">
                    <Icon name="phone" />
                  </span>
                  Practicing on another phone
                </button>
              ) : !['running', 'paused'].includes(readPracticeTimer().status) && (
                <button
                  className="home-practice"
                  onClick={() => {
                    startPracticeNow(profile);
                    openPracticeFromBadge();
                  }}
                >
                  <span className="home-practice-icon" aria-hidden="true">
                    {'▶\uFE0E'}
                  </span>
                  Start practice
                </button>
              )}
              <EndPracticeButton
                onEnd={(playerId) => {
                  if (playerId && playerId !== profile && profiles.some((p) => p.id === playerId)) {
                    changeProfile(playerId, true);
                  }
                  setEndPracticeOnOpen(true);
                  openPracticeFromBadge();
                }}
              />
              <button className="home-practice home-stickers" onClick={() => openTool('stickers')}>
                <span className="home-practice-icon" aria-hidden="true">
                  <Icon name="notebook" />
                </span>
                {/* Shorter during a practice, to fit beside End practice. */}
                {['running', 'paused'].includes(readPracticeTimer().status) ? 'Stickers' : 'Sticker book'}
                {cloudUser && pendingStickers(profile) > 0 && (
                  <span className="home-stickers-badge" aria-label={`${pendingStickers(profile)} waiting`}>
                    <Icon name="gift" /> {pendingStickers(profile)}
                  </span>
                )}
              </button>
            </div>
            {newColorName && (
              <NewColor
                key={`${profile}-${newColorName}`}
                playerName={currentProfile.name}
                color={COLORS.find((c) => c.name === newColorName)}
                engine={engineRef.current}
                noteLabel={noteLabel}
                onDone={() => {
                  newSound();
                  markColorMet(profile, newColorName);
                  setNewColorName(newColorFor(profile, profileColorNames));
                }}
              />
            )}


            {/* Everything else, small: Explore, Piano, Scales... */}
            <h3 className="home-more-title">More to play</h3>
            <div className="home-tiles home-more">
              {HOME_CARDS.map((card) => (
                <button
                  key={card.id}
                  className="home-tile"
                  style={{ '--card-from': card.from, '--card-to': card.to }}
                  onClick={() => openTool(card.id)}
                >
                  {!planOK && PAID_VIEWS.includes(card.id) && (
                    <span className="home-card-lock" aria-label="PitchPop Family">
                      <Icon name="star" />
                    </span>
                  )}
                  <span className="home-tile-icon" aria-hidden="true">
                    <Icon name={card.icon} />
                  </span>
                  <span className="home-tile-title">{card.title}</span>
                </button>
              ))}
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
              user={cloudUser}
              onOpenAccount={openAccount}
              onOpenTool={openTool}
              onOpenPractice={openPracticeFromBadge}
              showBack
              onBack={closeExplore}
            />
            <h2 className="screen-title">Explore</h2>
            <p className="screen-sub">Tap a pad to play its chord</p>
            <div className="rainbow-slot">
              <Rainbow colors={COLORS} activeName={celebrate} visible={!!celebrate} />
            </div>
            {/* Every white-key color, for everyone - Explore is for hearing
                them all, not just the ones this player is learning. A
                black-key chord (light green) only once the player has it
                in Pitch Practice. */}
            <div className="grid">
              {COLORS.filter((c) => !usesBlackKeys(c) || profileColorNames.includes(c.name)).map((color) => (
                <button
                  key={color.name}
                  className={`pad${justPlayed === color.name ? ' pad-played' : ''}`}
                  style={{ background: color.hex, color: color.text }}
                  aria-label={`Play ${color.name} chord`}
                  onClick={() => exploreTap(color)}
                >
                  <div className="pad-name">{color.name}</div>
                  <div className="pad-notes">{color.notes.map(noteLabel).join(' ')}</div>
                </button>
              ))}
            </div>
            {/* On to the game (or back to the round this was opened from). */}
            <button
              className="explore-to-game"
              onClick={preExploreView.startsWith('play-') ? closeExplore : startPlay}
            >
              {preExploreView.startsWith('play-') ? 'Back to Pitch Practice' : 'Ready? Start Pitch Practice'} →
            </button>
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
              onOpenPractice={openPracticeFromBadge}
              showBack
              onBack={goHome}
            />
            <StreakBadge streak={streak} />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} kinds={roundFocus?.kinds} outcomes={roundOutcomes} />
            <h2 className="screen-title">Listen to the chord</h2>
            <p className="screen-sub">Tap the rainbow to hear it</p>
            {roundIndex === 0 && roundFocus && <FocusTag focus={roundFocus} />}
            <button className="rainbow-play-wrap" onClick={listenTap} aria-label="Play chord">
              <Rainbow colors={COLORS} activeName={null} visible pretty />
              <span className="rainbow-center-btn">
                <PlayTriangleIcon />
              </span>
            </button>
            <div className="tap-pill">Tap to listen</div>
            <button className="hear-colors-link" onClick={() => openTool('explore')}>
              <Icon name="notes" /> Hear the colors
            </button>
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
              onOpenPractice={openPracticeFromBadge}
              showBack
              onBack={goHome}
            />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} kinds={roundFocus?.kinds} outcomes={roundOutcomes} />
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
              onOpenPractice={openPracticeFromBadge}
              showBack
              onBack={goHome}
            />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} kinds={roundFocus?.kinds} outcomes={roundOutcomes} />
            <KindChip focus={roundFocus} index={roundIndex} name={currentColor.name} />
            <h2 className={`screen-title${tries.out.length ? ' question-retry' : ''}`} key={`${tries.out.length}${tries.reveal}`}>
              {tries.reveal
                ? <>This is {capName(currentColor.name)}! Remember it <Icon name="ear" /></>
                : options.length === 2 && roundFocus?.kinds?.[roundIndex] === 'check'
                    ? `${capName(options[0].name)} or ${capName(options[1].name)}?`
                    : 'What chord did you hear?'}
            </h2>
            <button className="rainbow-play-wrap rainbow-play-wrap-compact" onClick={relistenTap} aria-label="Play chord again">
              <Rainbow colors={COLORS} activeName={null} visible pretty />
              <span className="rainbow-center-btn">
                <SpeakerIcon />
              </span>
            </button>
            <div
              className={`options-grid${options.length > 4 ? ' options-grid-3col' : ''}`}
              // Buttons fill the space under the rainbow, up to about 130px
              // tall each, so a few colors don't turn into huge slabs.
              style={{ maxHeight: Math.ceil(options.length / (options.length > 4 ? 3 : 2)) * 144 }}
            >
              {options.map((color) => {
                const out = tries.out.includes(color.name) || (tries.reveal && color.name !== currentColor.name);
                const glow = tries.reveal && color.name === currentColor.name;
                return (
                  <button
                    key={color.name}
                    className={`option-btn${out ? ' option-out' : ''}${glow ? ' option-glow' : ''}`}
                    style={{ background: color.hex, color: color.text }}
                    onClick={() => chooseAnswer(color)}
                    disabled={out}
                    aria-label={out ? `${color.name} (not this one)` : color.name}
                  >
                    {color.name}
                    {/* The chord's notes under its name (blue: B D G). */}
                    <span className="option-notes">{color.notes.map(noteLabel).join(' ')}</span>
                  </button>
                );
              })}
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
              onOpenPractice={openPracticeFromBadge}
              showBack
              onBack={goHome}
            />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} kinds={roundFocus?.kinds} outcomes={roundOutcomes} />
            <div
              className={`feedback-icon-wrap${answerCorrect ? ' feedback-correct' : ' feedback-incorrect'}${answerCorrect && typesNotes(profile) ? ' feedback-icon-small' : ''}`}
            >
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
            <h2 className="screen-title">
              {!answerCorrect ? 'Almost!' : tries.out.length ? `That's ${capName(currentColor.name)}!` : 'Great job!'}
            </h2>
            {answerCorrect && !typesNotes(profile) && (
              <p className="screen-sub">{tries.out.length ? 'Listen to it once more.' : "That's right!"}</p>
            )}
            {/* Players on the notes level type the notes, so the card
                doesn't give them away. */}
            {answerCorrect && typesNotes(profile) ? (
              <>
                <div className="answer-card answer-card-compact" style={{ background: currentColor.hex, color: currentColor.text }}>
                  <div className="answer-name">{currentColor.name}</div>
                </div>
                <TypeNotes
                  key={roundIndex}
                  color={currentColor}
                  engine={engineRef.current}
                  onNext={nextChord}
                  nextLabel={roundIndex + 1 >= SESSION_ROUNDS ? 'Finish' : 'Next chord'}
                />
              </>
            ) : (
              <div className="answer-card" style={{ background: currentColor.hex, color: currentColor.text }}>
                <div className="answer-name">{currentColor.name}</div>
                <div className="answer-notes">{currentColor.notes.map(noteLabel).join(' · ')}</div>
              </div>
            )}
            {!(answerCorrect && typesNotes(profile)) && (
            <div className="feedback-actions">
              {answerCorrect ? (
                <>
                  <button className="pill-btn-secondary" onClick={hearAgainFromFeedback}>
                    <Icon name="speaker" /> Hear again
                  </button>
                  <button className="pill-btn-primary" onClick={nextChord}>
                    {roundIndex + 1 >= SESSION_ROUNDS ? 'Finish' : 'Next chord'} →
                  </button>
                </>
              ) : (
                <>
                  <button className="pill-btn-primary pill-btn-full" onClick={chooseDifferentAnswer}>
                    Try again →
                  </button>
                </>
              )}
            </div>
            )}
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
              onOpenPractice={openPracticeFromBadge}
              showBack
              onBack={goHome}
            />
            {part2 && (
              <p className="part2-result">
                <Icon name="keys" /> Part 2 · Single notes: {part2.correct} of {part2.total} right
              </p>
            )}
            <RoundSummary
              playerName={currentProfile.name}
              colorNames={profileColorNames}
              correct={roundCorrect}
              wrong={roundWrong}
              streak={streak}
              summary={summarizeRound(sessionQueue, roundOutcomes, roundMixups, roundFocus)}
              history={loadRoundHistory()[profile] || []}
              focus={roundFocus}
              playerId={profile}
              signedIn={!!cloudUser}
              onStick={openStickerBookWith}
              onSignIn={openAccount}
              then={
                <>
                  {/* On to what's next in today's practice (NoteSpeller...). */}
                  {nextUpButton('color-test')}
                  <div className="feedback-actions">
                    <button className="pill-btn-secondary" onClick={() => openTool('progress')}>
                      <Icon name="chart" /> Progress
                    </button>
                    <button className="pill-btn-secondary" onClick={startPlay}>
                      Play again
                    </button>
                  </div>
                </>
              }
            />
          </>
        )}

        {showWelcome && view !== 'settings' && view !== 'account' && (
          <div className="welcome-backdrop">
            <div className="welcome-card" role="dialog" aria-labelledby="welcome-title">
              <div className="welcome-emoji"><Icon name="rainbow" /></div>
              <h2 id="welcome-title">Welcome to PitchPop!</h2>
              <p>
                A playful way to train your ear. Every chord has its own color: hear a chord, then pick the
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

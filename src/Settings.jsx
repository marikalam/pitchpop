import { useEffect, useState } from 'react';
import { usesBlackKeys } from './blackKeys.js';
import { deleteAccount, requestPasswordReset, signIn, signOut, signUp, updatePassword } from './cloud.js';
import { firstDay, streakFor } from './streak.js';
import { LEARNING_ORDER, READY_PCT, READY_ROUNDS } from './progress.js';
import { setTypesNotes, typesNotes } from './typeNotes.js';
import { inTinyTots, setTinyTots } from './tinyTots.js';
import { setVoiceLang, voiceLang } from './voiceLang.js';
import {
  CLEF_MODES,
  LETTERS,
  LEVELS,
  readingClef,
  readingLetters,
  readingLevel,
  setReadingClef,
  setReadingLetters,
  setReadingLevel,
} from './noteReading.js';

// A password input with an eye button that shows or hides what's typed.
function PasswordField({ label, value, onChange, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-field">
      <span>{label}</span>
      <span className="password-wrap">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          minLength={6}
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </span>
    </label>
  );
}

const PASSWORDS_DIFFER = 'The two passwords don’t match. Please type them again.';

function formatDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function PlayerHistory({ days, onSignIn }) {
  if (onSignIn) {
    return (
      <p className="player-history">
        <button className="link-btn" onClick={onSignIn}>
          Sign in
        </button>{' '}
        to keep this player's streaks and history
      </p>
    );
  }
  const since = firstDay(days);
  if (!since) return <p className="player-history">Hasn't finished a round yet</p>;
  const { current, best } = streakFor(days);
  return (
    <p className="player-history">
      Playing since <strong>{formatDay(since)}</strong>
      <span className="player-history-streak">
        {current > 0
          ? `🔥 ${current} ${current === 1 ? 'day' : 'days'} in a row · best ${best}`
          : `Best streak: ${best} ${best === 1 ? 'day' : 'days'}`}
      </span>
    </p>
  );
}

const cap = (name) => name.charAt(0).toUpperCase() + name.slice(1);

// The way through PitchPop, shown at the top of Players & colors.
export function LearningGuide() {
  const [open, setOpen] = useState(false);
  return (
    <section className="learn-guide">
      <button className="learn-guide-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>📘 How to learn, step by step</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ol className="learn-steps">
          <li>
            <b>🧸 Tiny Tots</b>
            <span>For little ones. Big colors to tap: each plays its chord and says its name. No right or wrong.</span>
          </li>
          <li>
            <b>🌈 Start with 3 colors</b>
            <span>When they can play a short game, switch to the color game with Red, Yellow and Blue.</span>
          </li>
          <li>
            <b>➕ Add one color at a time</b>
            <span>
              In this order: {LEARNING_ORDER.slice(3).map(cap).join(', ')}. Add the next color only when they get{' '}
              {READY_PCT}% or more on every color, {READY_ROUNDS} rounds in a row. The Progress page shows when they're
              ready.
            </span>
          </li>
          <li>
            <b>🎹 Type the notes</b>
            <span>Once every color is mastered, turn on Type the notes: after the color, they play its letters.</span>
          </li>
        </ol>
      )}
    </section>
  );
}

export function PlayerSettingsCard({
  profile,
  colors,
  onUpdate,
  onRemove,
  canRemove,
  playDays,
  onSignIn,
  freeColors,
  onLocked,
}) {
  // The notes level is kept on this device, and changes straight away.
  const [notesOn, setNotesOn] = useState(() => typesNotes(profile.id));
  function toggleNotes(on) {
    setNotesOn(on);
    setTypesNotes(profile.id, on);
  }
  const [totsOn, setTotsOn] = useState(() => inTinyTots(profile.id));
  const [voice, setVoice] = useState(() => voiceLang(profile.id));
  const [readLetters, setReadLetters] = useState(() => readingLetters(profile.id));
  const [readClef, setReadClef] = useState(() => readingClef(profile.id));
  const [readLevel, setReadLevel] = useState(() => readingLevel(profile.id));
  // Which section is open: one at a time, Pitch Practice to start.
  const [open, setOpen] = useState('pitch');
  const section = (id, icon, title, summary, body) => (
    <div className={`ps-fold${open === id ? ' ps-fold-open' : ''}`}>
      <button className="ps-fold-head" onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
        <span className="ps-fold-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="ps-fold-text">
          <b>{title}</b>
          <span>{summary}</span>
        </span>
        <span className="ps-fold-arrow" aria-hidden="true">
          ▾
        </span>
      </button>
      {open === id && <div className="ps-fold-body">{body}</div>}
    </div>
  );

  // NoteSpeller's letters for this player (at least two stay on).
  function toggleReadLetter(letter) {
    const on = readLetters.includes(letter);
    if (on && readLetters.length <= 2) return;
    const next = LETTERS.filter((l) => (l === letter ? !on : readLetters.includes(l)));
    setReadLetters(next);
    setReadingLetters(profile.id, next);
  }

  function toggleColor(name) {
    // More than the free colors needs PitchPop Family (plan.js).
    if (freeColors && !profile.colors.includes(name) && profile.colors.length >= freeColors) {
      onLocked?.();
      return;
    }
    const next = profile.colors.includes(name) ? profile.colors.filter((c) => c !== name) : [...profile.colors, name];
    onUpdate({ colors: next.length ? next : ['red'] });
  }

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <input
          className="profile-name-input"
          value={profile.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          aria-label={`${profile.name} name`}
        />
        {/* The voice, small: tap to switch English / 日本語 (colors,
            notes in ドレミ and results in Japanese). */}
        <button
          className="voice-pill"
          type="button"
          onClick={() => {
            const next = voice === 'ja' ? 'en' : 'ja';
            setVoice(next);
            setVoiceLang(profile.id, next);
          }}
          aria-label={`Voice: ${voice === 'ja' ? 'Japanese' : 'English'}. Tap to switch.`}
        >
          🗣 {voice === 'ja' ? '日本語' : 'EN'}
        </button>
      </div>
      <PlayerHistory days={playDays} onSignIn={onSignIn} />

      {/* Pitch Practice: which colors, and how the player plays them. */}
      {section(
        'pitch',
        '🌈',
        'Pitch Practice',
        `${profile.colors.length} ${profile.colors.length === 1 ? 'color' : 'colors'} · ${
          totsOn ? 'Tiny Tots' : notesOn ? 'Color game · Type the notes' : 'Color game'
        }`,
        <>
          <div className="ps-row ps-row-top">
            <span className="ps-label">Colors</span>
            <div>
              {[
                ['White keys', colors.filter((c) => !usesBlackKeys(c))],
                ['Black keys', colors.filter(usesBlackKeys)],
              ]
                .filter(([, group]) => group.length)
                .map(([label, group]) => (
                  <div key={label} className="color-settings-group">
                    <div className="color-settings-group-label">{label}</div>
                    <div className="color-settings-grid">
                      {[...group]
                        .sort((a, b) => LEARNING_ORDER.indexOf(a.name) - LEARNING_ORDER.indexOf(b.name))
                        .map((color) => (
                          <button
                            key={color.name}
                            className={`color-setting${profile.colors.includes(color.name) ? ' color-setting-active' : ''}${
                              color.name === LEARNING_ORDER.find((n) => !profile.colors.includes(n))
                                ? ' color-setting-next'
                                : ''
                            }`}
                            style={{ background: color.hex, color: color.text }}
                            onClick={() => toggleColor(color.name)}
                            aria-pressed={profile.colors.includes(color.name)}
                          >
                            {color.name}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              <p className="ps-hint">
                Learning order: {profile.colors.map((c) => c[0].toUpperCase() + c.slice(1)).join(', ')}
              </p>
            </div>
          </div>
          <div className="ps-row">
            <span className="ps-label">Plays</span>
            <div className="ns-segmented" role="radiogroup" aria-label="How Pitch Practice plays">
              {[
                [false, '🌈 Color game'],
                [true, '🧸 Tiny Tots'],
              ].map(([tots, label]) => (
                <button
                  key={label}
                  role="radio"
                  aria-checked={totsOn === tots}
                  className={`ns-segment${totsOn === tots ? ' ns-segment-active' : ''}`}
                  onClick={() => {
                    setTotsOn(tots);
                    setTinyTots(profile.id, tots);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {totsOn ? (
            <p className="ps-hint ps-hint-indent">
              Big colors to tap: each plays its chord and says its name. No right or wrong.
            </p>
          ) : (
            <label className="ps-switch-row">
              <span className="ps-switch-text">
                <b>🎹 Type the notes</b>
                <span>After the color, play its letters (red: C, E, G)</span>
              </span>
              <input
                type="checkbox"
                className="ps-switch"
                checked={notesOn}
                onChange={(e) => toggleNotes(e.target.checked)}
              />
            </label>
          )}
        </>,
      )}

      {/* NoteSpeller: what this player reads. */}
      {section(
        'notes',
        '🎼',
        'NoteSpeller',
        `${CLEF_MODES.find((m) => m.id === readClef).label.replace(' clef', '')} · ${
          LEVELS.find((l) => l.id === readLevel).label
        } · ${readLetters.length === LETTERS.length ? 'All notes' : `Only ${readLetters.join(', ')}`}`,
        <>
          <div className="ps-row">
            <span className="ps-label">Clef</span>
            <div className="ns-segmented" role="radiogroup" aria-label="Clef">
              {CLEF_MODES.map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={readClef === m.id}
                  className={`ns-segment${readClef === m.id ? ' ns-segment-active' : ''}`}
                  onClick={() => {
                    setReadClef(m.id);
                    setReadingClef(profile.id, m.id);
                  }}
                >
                  {m.label.replace(' clef', '')}
                </button>
              ))}
            </div>
          </div>
          <div className="ps-row">
            <span className="ps-label">Staff</span>
            <div className="ns-segmented" role="radiogroup" aria-label="Which part of the staff">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  role="radio"
                  aria-checked={readLevel === l.id}
                  className={`ns-segment${readLevel === l.id ? ' ns-segment-active' : ''}`}
                  onClick={() => {
                    setReadLevel(l.id);
                    setReadingLevel(profile.id, l.id);
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <p className="ps-hint ps-hint-indent">{LEVELS.find((l) => l.id === readLevel).hint}</p>
          <div className="ps-row">
            <span className="ps-label">Notes</span>
            <div className="ns-letter-picks" role="group" aria-label="NoteSpeller notes">
              {LETTERS.map((l) => (
                <button
                  key={l}
                  aria-pressed={readLetters.includes(l)}
                  className={`ns-letter-pick${readLetters.includes(l) ? ' ns-letter-pick-on' : ''}`}
                  onClick={() => toggleReadLetter(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="ps-hint ps-hint-indent">
            {readLetters.length === LETTERS.length
              ? 'All notes. Tap a letter to leave it out.'
              : `Only ${readLetters.join(', ')}`}
          </p>
        </>,
      )}
      {canRemove && (
        <button className="remove-player-link" type="button" onClick={onRemove}>
          Remove player
        </button>
      )}
    </section>
  );
}

export function AddPlayerForm({ onAdd }) {
  const [name, setName] = useState('');
  return (
    <form
      className="add-profile"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(name);
        setName('');
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New player name"
        aria-label="New player name"
      />
      <button className="pill-btn-primary" type="submit">
        Add player
      </button>
    </form>
  );
}

function initialFor(user) {
  return (user?.email || '?').trim().charAt(0).toUpperCase();
}

function memberSince(user) {
  if (!user?.created_at) return null;
  const created = new Date(user.created_at);
  if (Number.isNaN(created.getTime())) return null;
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(new Date()) - startOfDay(created)) / 86400000);
  return {
    date: created.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    ago: days <= 0 ? 'Joined today' : days === 1 ? 'Joined yesterday' : `${days.toLocaleString()} days with PitchPop`,
  };
}

export function AccountButton({ user, onClick }) {
  if (user) {
    return (
      <button className="account-btn account-btn-signed-in" onClick={onClick} aria-label={`Account: ${user.email}`}>
        {initialFor(user)}
      </button>
    );
  }
  return (
    <button className="account-btn account-btn-signed-out" onClick={onClick} aria-label="Sign in or create account">
      <span className="account-btn-line1">Sign in</span>
      <span className="account-btn-line2">or create account</span>
    </button>
  );
}

// Whether the phone has an internet connection right now.
function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function SyncStatus({ user, onOpenAccount }) {
  const online = useOnline();
  if (user && !online) {
    return (
      <div className="sync-status sync-status-offline">
        <span className="sync-dot sync-dot-offline" aria-hidden="true" />
        <span>
          Offline: changes are saved on this phone and sync to <strong>{user.email}</strong> when you’re back online
        </span>
      </div>
    );
  }
  if (user) {
    return (
      <div className="sync-status sync-status-on">
        <span className="sync-dot" aria-hidden="true" />
        <span>
          Synced to <strong>{user.email}</strong>
        </span>
      </div>
    );
  }
  return (
    <button className="sync-status sync-status-off" onClick={onOpenAccount}>
      <span>Saved on this device only</span>
      <span className="sync-link">Sign in to sync →</span>
    </button>
  );
}

export function AccountScreen({
  user,
  playerCount,
  onSignedIn,
  onAccountDeleted,
  onOpenPlayers,
  onOpenStats,
  recoveryMode,
  onPasswordUpdated,
  startMode = 'sign-in',
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [mode, setMode] = useState(startMode);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (mode === 'sign-up' && password !== confirmPassword) {
      setError(PASSWORDS_DIFFER);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'reset-request') {
        await requestPasswordReset(email);
        setNotice(`We sent a password reset link to ${email}. Open it on this device to set a new password.`);
        return;
      }
      const signedIn = mode === 'sign-in' ? await signIn(email, password) : await signUp(email, password);
      if (signedIn) {
        await onSignedIn(signedIn);
        setPassword('');
        setConfirmPassword('');
      } else {
        setNotice(
          mode === 'sign-up'
            ? `Check ${email} for a link to confirm your account, then sign in here. Already have an account? Just sign in.`
            : `We sent a confirmation link to ${email}. Open it, then sign in here.`,
        );
        setMode('sign-in');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmNewPassword) {
      setError(PASSWORDS_DIFFER);
      return;
    }
    setBusy(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmNewPassword('');
      onPasswordUpdated();
      setNotice('Your password has been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    onSignedIn(null);
  }

  async function handleDeleteAccount() {
    if (
      !window.confirm(`Delete the account for ${user.email}? All players and their progress will be deleted.`) ||
      !window.confirm('Are you really sure? This can’t be undone.')
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await deleteAccount();
      onAccountDeleted();
      setNotice('Your account and its players have been deleted.');
    } catch (err) {
      setError(`Couldn’t delete your account: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (recoveryMode) {
    return (
      <div className="account-screen">
        <div className="auth-card">
          <h2 className="auth-title">Choose a new password</h2>
          <p className="auth-sub">Enter a new password for {user?.email || 'your account'}.</p>
          <form className="auth-form" onSubmit={handleResetPassword}>
            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 6 characters"
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmNewPassword}
              onChange={setConfirmNewPassword}
              placeholder="Type it again"
            />
            {error && <div className="auth-error">{error}</div>}
            {notice && <div className="auth-notice">{notice}</div>}
            <button className="pill-btn-primary pill-btn-full" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Save new password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (user) {
    const since = memberSince(user);
    return (
      <div className="account-screen">
        <div className="account-profile">
          <div className="account-avatar">{initialFor(user)}</div>
          <div className="account-email">{user.email}</div>
          <div className="account-badge">
            <span className="sync-dot" aria-hidden="true" />
            Signed in
          </div>
        </div>

        {since && (
          <div className="account-section">
            <div className="account-row">
              <span className="account-row-label">Member since</span>
              <span className="account-row-value">{since.date}</span>
            </div>
            <p className="account-row-help">{since.ago}</p>
          </div>
        )}

        <div className="account-section">
          <div className="account-row">
            <span className="account-row-label">Sync</span>
            <span className="account-row-value">On</span>
          </div>
          <p className="account-row-help">
            Players and colors are saved to your account and load on any device you sign in on.
          </p>
        </div>

        <div className="account-section">
          <button className="account-row account-row-button" onClick={onOpenPlayers}>
            <span className="account-row-label">Players &amp; colors</span>
            <span className="account-row-value">
              {playerCount} {playerCount === 1 ? 'player' : 'players'} ›
            </span>
          </button>
          {onOpenStats && (
            <button className="account-row account-row-button" onClick={onOpenStats}>
              <span className="account-row-label">📊 PitchPop stats</span>
              <span className="account-row-value">›</span>
            </button>
          )}
        </div>

        <button className="account-signout" onClick={handleSignOut}>
          Sign out
        </button>
        {error && <div className="auth-error">{error}</div>}
        <button className="account-delete" onClick={handleDeleteAccount} disabled={busy}>
          {busy ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    );
  }

  if (mode === 'reset-request') {
    return (
      <div className="account-screen">
        <div className="auth-card">
          <h2 className="auth-title">Reset your password</h2>
          <p className="auth-sub">Enter your email and we'll send you a link to set a new password.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            {notice && <div className="auth-notice">{notice}</div>}
            <button className="pill-btn-primary pill-btn-full" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Send reset link'}
            </button>
          </form>
        </div>

        <button
          className="back-link back-link-center"
          onClick={() => {
            setMode('sign-in');
            setError('');
            setNotice('');
          }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="account-screen">
      <div className="auth-card">
        <h2 className="auth-title">{mode === 'sign-in' ? 'Sign in to PitchPop' : 'Create your family account'}</h2>
        <p className="auth-sub">Keep your players and colors in sync across all your devices.</p>

        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'sign-in'}
            className={`auth-tab${mode === 'sign-in' ? ' auth-tab-active' : ''}`}
            onClick={() => {
              setMode('sign-in');
              setError('');
            }}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === 'sign-up'}
            className={`auth-tab${mode === 'sign-up' ? ' auth-tab-active' : ''}`}
            onClick={() => {
              setMode('sign-up');
              setError('');
            }}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <PasswordField
            label="Password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={setPassword}
            placeholder={mode === 'sign-in' ? 'Your password' : 'At least 6 characters'}
          />
          {mode === 'sign-up' && (
            <PasswordField
              label="Confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Type it again"
            />
          )}
          {mode === 'sign-in' && (
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => {
                setMode('reset-request');
                setError('');
                setNotice('');
              }}
            >
              Forgot password?
            </button>
          )}
          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}
          <button className="pill-btn-primary pill-btn-full" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

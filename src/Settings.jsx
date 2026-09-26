import { useState } from 'react';
import { signIn, signOut, signUp } from './cloud.js';

export function PlayerSettingsCard({ profile, colors, onUpdate, onRemove, canRemove }) {
  function toggleColor(name) {
    const next = profile.colors.includes(name)
      ? profile.colors.filter((c) => c !== name)
      : [...profile.colors, name];
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
        <button className="remove-player-btn" type="button" onClick={onRemove} disabled={!canRemove}>
          Remove
        </button>
      </div>
      <p className="settings-help">
        Color {profile.colors.length}: {profile.colors.join(' / ')}
      </p>
      <div className="color-settings-grid">
        {colors.map((color) => (
          <button
            key={color.name}
            className={`color-setting${profile.colors.includes(color.name) ? ' color-setting-active' : ''}`}
            style={{ background: color.hex, color: color.text }}
            onClick={() => toggleColor(color.name)}
            aria-pressed={profile.colors.includes(color.name)}
          >
            {color.name}
          </button>
        ))}
      </div>
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

export function AccountButton({ user, onClick }) {
  if (user) {
    return (
      <button className="account-btn account-btn-signed-in" onClick={onClick} aria-label={`Account: ${user.email}`}>
        {initialFor(user)}
      </button>
    );
  }
  return (
    <button className="account-btn account-btn-signed-out" onClick={onClick}>
      Sign in
    </button>
  );
}

export function SyncStatus({ user, onOpenAccount }) {
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

export function AccountScreen({ user, playerCount, onSignedIn, onOpenPlayers, onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('sign-in');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const signedIn = mode === 'sign-in' ? await signIn(email, password) : await signUp(email, password);
      if (signedIn) {
        await onSignedIn(signedIn);
        setPassword('');
      } else {
        setNotice(`We sent a confirmation link to ${email}. Open it, then sign in here.`);
        setMode('sign-in');
      }
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

  if (user) {
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

        <div className="account-section">
          <div className="account-row">
            <span className="account-row-label">Sync</span>
            <span className="account-row-value">On</span>
          </div>
          <p className="account-row-help">Players and colors are saved to your account and load on any device you sign in on.</p>
        </div>

        <div className="account-section">
          <button className="account-row account-row-button" onClick={onOpenPlayers}>
            <span className="account-row-label">Players &amp; colors</span>
            <span className="account-row-value">
              {playerCount} {playerCount === 1 ? 'player' : 'players'} ›
            </span>
          </button>
        </div>

        <button className="account-signout" onClick={handleSignOut}>
          Sign out
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
          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'sign-in' ? 'Your password' : 'At least 6 characters'}
              minLength={6}
              required
            />
          </label>
          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}
          <button className="pill-btn-primary pill-btn-full" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>

      <button className="back-link back-link-center" onClick={onDone}>
        Continue without an account
      </button>
    </div>
  );
}

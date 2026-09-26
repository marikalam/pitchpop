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

export function CloudAccount({ user, onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('sign-in');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const signedIn = mode === 'sign-in' ? await signIn(email, password) : await signUp(email, password);
      if (signedIn) {
        await onSignedIn(signedIn);
        setMessage('Cloud storage is connected.');
      } else {
        setMessage('Check your email to finish creating the account.');
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="cloud-account cloud-account-connected">
        <div>
          <strong>Cloud storage connected</strong>
          <span>{user.email}</span>
        </div>
        <button
          className="back-link"
          onClick={async () => {
            await signOut();
            onSignedIn(null);
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <form className="cloud-account" onSubmit={handleSubmit}>
      <strong>{mode === 'sign-in' ? 'Sync across devices' : 'Create family account'}</strong>
      <p>Sign in to save players and colors in Supabase.</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        minLength={6}
        required
      />
      <button className="pill-btn-primary" type="submit" disabled={busy}>
        {busy ? 'Connecting...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
      </button>
      <button
        className="back-link"
        type="button"
        onClick={() => setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'))}
      >
        {mode === 'sign-in' ? 'New family account' : 'Already have an account'}
      </button>
      {message && <span className="cloud-message">{message}</span>}
    </form>
  );
}

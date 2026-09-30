import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';

// "Playing as": the player pill in the header, next to the account button,
// picks which player is playing. Signed in, it also leads to the family's
// Players & colors settings. The rest of the app lives in the ☰ menu
// (MainMenu).
export default function ProfileSwitcher({ profile, profiles, colors, signedIn, onChange, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = profiles.find((p) => p.id === profile) || profiles[0];

  // Tapping anywhere outside the menu closes it.
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="profile-switcher" ref={ref}>
      <button
        className="profile-pill"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Playing as ${current.name}. Change player.`}
      >
        <Avatar profile={profile} size={26} />
        <span className="profile-pill-name">{current.name}</span>
        <span className="profile-pill-chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="profile-menu">
          {profiles.map((p) => (
            <button
              key={p.id}
              className={`profile-menu-item${p.id === profile ? ' profile-menu-item-active' : ''}`}
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
            >
              <Avatar profile={p.id} size={24} />
              <span>{p.name}</span>
              <span className="profile-level" aria-label={`Learning ${p.colors.join(', ')}`}>
                {p.colors.map((name) => {
                  const color = colors.find((c) => c.name === name);
                  return color && <span key={name} className="profile-level-bar" style={{ background: color.hex }} />;
                })}
              </span>
            </button>
          ))}
          {signedIn && (
            <div className="profile-menu-section">
              <button
                className="profile-settings-item"
                onClick={() => {
                  onOpenSettings();
                  setOpen(false);
                }}
              >
                ⚙️ <span>Players &amp; colors</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

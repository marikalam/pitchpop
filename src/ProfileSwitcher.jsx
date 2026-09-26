import { useState } from 'react';
import Avatar from './Avatar.jsx';

export default function ProfileSwitcher({ profile, profiles, colors, onChange, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  const current = profiles.find((p) => p.id === profile) || profiles[0];

  return (
    <div className="profile-switcher">
      <button className="profile-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Avatar profile={profile} size={28} />
        <span className="profile-pill-text">
          <span className="profile-pill-label">Playing as</span>
          <span className="profile-pill-name">{current.name}</span>
        </span>
        <span className="profile-pill-chevron">▾</span>
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
  );
}

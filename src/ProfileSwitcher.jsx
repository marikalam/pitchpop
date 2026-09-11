import { useState } from 'react';
import Avatar from './Avatar.jsx';

const LABELS = { maddie: 'Maddie', marcus: 'Marcus' };
const PROFILES = ['maddie', 'marcus'];

export default function ProfileSwitcher({ profile, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="profile-switcher">
      <button className="profile-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Avatar profile={profile} size={28} />
        <span className="profile-pill-text">
          <span className="profile-pill-label">Playing as</span>
          <span className="profile-pill-name">{LABELS[profile]}</span>
        </span>
        <span className="profile-pill-chevron">▾</span>
      </button>
      {open && (
        <div className="profile-menu">
          {PROFILES.map((p) => (
            <button
              key={p}
              className={`profile-menu-item${p === profile ? ' profile-menu-item-active' : ''}`}
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
            >
              <Avatar profile={p} size={24} />
              <span>{LABELS[p]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

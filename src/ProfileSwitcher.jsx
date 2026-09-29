import { useState } from 'react';
import Avatar from './Avatar.jsx';

// Everything besides the color game, grouped the way a family uses it:
// things to play with, things to learn, and practice-time tools.
const MENU_SECTIONS = [
  {
    title: 'Play',
    items: [
      { id: 'explore', icon: '🎵', label: 'Explore sounds' },
      { id: 'piano', icon: '🎹', label: 'Piano' },
    ],
  },
  {
    title: 'Learn',
    items: [
      { id: 'notespeller', icon: '🎼', label: 'NoteSpeller' },
      { id: 'theory', icon: '📖', label: 'Music Theory' },
    ],
  },
  {
    title: 'Practice',
    items: [{ id: 'practice', icon: '⏱️', label: 'Practice Mode' }],
  },
];

export default function ProfileSwitcher({ profile, profiles, colors, onChange, onOpenSettings, onOpenTool }) {
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
          {MENU_SECTIONS.map((section) => (
            <div key={section.title} className="profile-menu-section">
              <div className="profile-menu-heading">{section.title}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className="profile-settings-item"
                  onClick={() => {
                    onOpenTool(item.id);
                    setOpen(false);
                  }}
                >
                  {item.icon} <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
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
        </div>
      )}
    </div>
  );
}

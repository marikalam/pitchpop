import { useEffect, useRef, useState } from 'react';

// The ☰ menu: every part of the app besides picking a player, grouped the
// way a family uses it. Home and Pitch Practice (the color game) come
// first, so there's a way back to them from anywhere. Learn needs an
// account.
const MENU_SECTIONS = [
  {
    title: 'Play',
    items: [
      { id: 'home', icon: '🏠', label: 'Home' },
      { id: 'color-test', icon: '🌈', label: 'Pitch Practice' },
      { id: 'explore', icon: '🎵', label: 'Explore sounds' },
      { id: 'piano', icon: '🎹', label: 'Piano' },
      { id: 'sound-check', icon: '🔊', label: 'Sound check' },
    ],
  },
  {
    title: 'Learn',
    signedInOnly: true,
    items: [
      { id: 'notespeller', icon: '🎼', label: 'NoteSpeller' },
      { id: 'theory', icon: '📖', label: 'Music Theory' },
    ],
  },
  {
    title: 'Practice',
    items: [{ id: 'practice', icon: '⏱️', label: 'Practice Mode' }],
  },
  {
    title: 'About',
    items: [{ id: 'method', icon: '🎓', label: 'The Eguchi method' }],
  },
];

export default function MainMenu({ signedIn, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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
    <div className="main-menu" ref={ref}>
      <button
        className="main-menu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      {open && (
        <div className="profile-menu main-menu-panel">
          {MENU_SECTIONS.filter((section) => signedIn || !section.signedInOnly).map((section, i) => (
            <div key={section.title} className={i === 0 ? 'main-menu-section-first' : 'profile-menu-section'}>
              <div className="profile-menu-heading">{section.title}</div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className="profile-settings-item"
                  onClick={() => {
                    onOpen(item.id);
                    setOpen(false);
                  }}
                >
                  {item.icon} <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

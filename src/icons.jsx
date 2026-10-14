const STROKE = { fill: 'none', stroke: '#fff', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function MusicNoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE}>
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" fill="#fff" stroke="none" />
      <circle cx="16" cy="16" r="3" fill="#fff" stroke="none" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE}>
      <path d="M12 6c-2-1.5-5-2-8-1v13c3-1 6-0.5 8 1c2-1.5 5-2 8-1V5c-3-1-6-0.5-8 1Z" />
      <path d="M12 6v13" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE}>
      <path d="M5 19V11" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
    </svg>
  );
}

export function PlayTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26">
      <path d="M8 5.5 L19 12 L8 18.5 Z" fill="#3B6FEF" />
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#3B6FEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10v4h4l5 4V6L8 10Z" fill="#3B6FEF" stroke="none" />
      <path d="M16.5 9a4.5 4.5 0 0 1 0 6" />
      <path d="M19 6.5a8.5 8.5 0 0 1 0 11" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13 L10 18 L19 7" />
    </svg>
  );
}

export function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6 L18 18" />
      <path d="M18 6 L6 18" />
    </svg>
  );
}

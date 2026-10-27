import { ICONS } from './icons.js';

// One of PitchPop's icons (icons.js), sized to the text around it unless
// `size` says otherwise. Decorative: the words next to it say what it is.
export default function Icon({ name, size, className = '' }) {
  const art = ICONS[name];
  if (!art) return null;
  return (
    <svg
      className={`pp-icon ${className}`.trim()}
      viewBox="0 0 48 48"
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: art }}
    />
  );
}

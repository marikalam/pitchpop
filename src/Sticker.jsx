import { useId } from 'react';
import { stickerMove, stickerSvg } from './stickers.js';

// One sticker from the book (stickers.js), drawn at `size` pixels, moving
// gently (still = true for none).
export default function Sticker({ index, size = 48, className = '', still = false }) {
  const id = `stk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <span
      className={`sticker${still ? '' : ` sticker-${stickerMove(index)}`} ${className}`}
      style={{ width: size, height: size, animationDelay: `${-(index % 7) * 0.37}s` }}
      // The SVG is our own drawing (stickers.js), not anything typed in.
      dangerouslySetInnerHTML={{ __html: stickerSvg(index, id) }}
    />
  );
}

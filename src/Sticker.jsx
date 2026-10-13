import { useId } from 'react';
import { stickerSvg } from './stickers.js';

// One sticker from the book (stickers.js), drawn at `size` pixels.
export default function Sticker({ index, size = 48, className = '' }) {
  const id = `stk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <span
      className={`sticker ${className}`}
      style={{ width: size, height: size }}
      // The SVG is our own drawing (stickers.js), not anything typed in.
      dangerouslySetInnerHTML={{ __html: stickerSvg(index, id) }}
    />
  );
}

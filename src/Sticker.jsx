import { useId } from 'react';
import { stickerMove, stickerSvg } from './stickers.js';

// A sticker drawing. It sits still unless `play` is set (when it's being
// stuck into the sticker book): then it does its own move a couple of times.
export default function Sticker({ index, size = 48, className = '', play = false }) {
  const id = `stk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <span
      className={`sticker${play ? ` sticker-play sticker-${stickerMove(index)}` : ''} ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: stickerSvg(index, id, play) }}
    />
  );
}

// Sticker rewards: a player earns one sticker for each day they finish a
// Pitch Practice round (their streak days, so stickers follow the family
// account to every device). The book fills in this order, then starts a
// new page.
export const STICKERS = [
  ['🐶', 'Puppy'],
  ['🌈', 'Rainbow'],
  ['🎹', 'Piano'],
  ['⭐', 'Star'],
  ['🐱', 'Kitty'],
  ['🍓', 'Strawberry'],
  ['🦄', 'Unicorn'],
  ['🐼', 'Panda'],
  ['🚀', 'Rocket'],
  ['🌻', 'Sunflower'],
  ['🐢', 'Turtle'],
  ['🍦', 'Ice cream'],
  ['🦋', 'Butterfly'],
  ['🎈', 'Balloon'],
  ['🐳', 'Whale'],
  ['🍩', 'Donut'],
  ['🦊', 'Fox'],
  ['🎺', 'Trumpet'],
  ['🐧', 'Penguin'],
  ['👑', 'Crown'],
];
export const BOOK_SIZE = STICKERS.length;

// The sticker earned on the nth practice day (1st day: index 0).
export function stickerFor(index) {
  const [emoji, name] = STICKERS[index % BOOK_SIZE];
  return { emoji, name };
}

// The screens' language: English, or Japanese for a player whose family
// picked 日本語 in the header's language menu (a setting per player, like
// the voice: voiceLang.js). Kid-facing screens are translated; anything
// not in JA below stays in English. The text is the English itself, so
// t('Great job!') is 'すごいね！' in Japanese and 'Great job!' otherwise.
// Kids' Japanese: mostly hiragana, simple words.
import { touchSettings } from './settingsClock.js';

const KEY = 'pitchpop-screen-lang-v1';
let current = 'en';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function screenLang(profileId) {
  return load()[profileId] === 'ja' ? 'ja' : 'en';
}

export function setScreenLang(profileId, lang) {
  const next = { ...load() };
  if (lang === 'ja') next[profileId] = 'ja';
  else delete next[profileId];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  setTimeout(() => touchSettings(profileId), 0);
}

// Set by App on every render, for whoever is playing.
export function setScreenLanguage(lang) {
  current = lang === 'ja' ? 'ja' : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}

export const screenLanguage = () => current;

const COLORS = {
  red: 'あか',
  yellow: 'きいろ',
  blue: 'あお',
  black: 'くろ',
  green: 'みどり',
  orange: 'オレンジ',
  purple: 'むらさき',
  pink: 'ピンク',
  brown: 'ちゃいろ',
  'light green': 'きみどり',
  beige: 'ベージュ',
};
const SOLFEGE = { C: 'ド', D: 'レ', E: 'ミ', F: 'ファ', G: 'ソ', A: 'ラ', B: 'シ' };

// A color's name to show: "Red", or あか.
export function colorLabel(name = '') {
  if (current === 'ja' && COLORS[name]) return COLORS[name];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// A note's letter to show: "C", or ド (sharps and flats kept: ド♯).
export function noteText(letter = '') {
  if (current !== 'ja') return letter;
  return (SOLFEGE[letter.charAt(0)] || letter.charAt(0)) + letter.slice(1);
}

const JA = {
  // Header, menu
  Home: 'ホーム',
  'PitchPop Family': 'PitchPop ファミリー',
  'Perfect Pitch': 'ぜったいおんかん',
  'Pitch Practice': 'おんかんれんしゅう',
  'Explore sounds': 'おとをきいてみよう',
  'Sticker book': 'シールちょう',
  Stickers: 'シール',
  Progress: 'きろく',
  'The Eguchi method': 'えぐちしきについて',
  'Piano tools': 'ピアノのどうぐ',
  Piano: 'ピアノ',
  Scales: 'スケール',
  Hanon: 'ハノン',
  'Practice Mode': 'れんしゅうモード',
  Learn: 'まなぶ',
  NoteSpeller: 'おんぷよみ',
  'Music Theory': 'がくてん',
  // Home
  Explore: 'きいてみよう',
  Practice: 'れんしゅう',
  Notes: 'おんぷ',
  Theory: 'がくてん',
  'How it works': 'つかいかた',
  'Hi, {name}!': 'こんにちは、{name}！',
  'Every chord has a color': 'わおんには いろがある',
  'What would you like to play today?': 'きょうは なにを する？',
  'Start practice': 'れんしゅうを はじめる',
  'Finish a round to start a streak': '1かい やって れんぞくきろくを はじめよう',
  'Finish a round today to keep it going': 'きょうも 1かい やって つづけよう',
  "Today's practice": 'きょうの れんしゅう',
  'All done today!': 'きょうは ぜんぶ できた！',
  '{done} of {total} done today': 'きょう {done}/{total} できた',
  '{done} of {total} done · finish all {total} for a bonus sticker': '{done}/{total} できた · ぜんぶ できたら ボーナスシール',
  'You earned a bonus sticker': 'ボーナスシールを もらったよ',
  'Pitch': 'おんかん',
  'Tiny Tots': 'ちびっこ',
  'Theory quiz': 'がくてんクイズ',
  'Piano practice': 'ピアノれんしゅう',
  'Twin practice': 'ふたごれんしゅう',
  'Color Chords': 'いろの わおん',
  'Single Notes': 'ひとつの おと',
  '{count} of {target} today': 'きょう {count}/{target}',
  'Read 20 notes on the staff': 'ごせんの おんぷを 20こ よもう',
  '20 music signs': 'がくふの きごう 20こ',
  'Start the timer, then play': 'タイマーを スタートして ひこう',
  '{min} min today': 'きょう {min}ぷん',
  'Yesterday was {min} min': 'きのうは {min}ぷん',
  'Twin practice: {a} or {b}?': 'ふたごれんしゅう：{a}？ {b}？',
  'Mixed up {n} times this week · get 10 in a row, just these two': 'こんしゅう {n}かい まちがえたよ · この2つで 10れんぞく せいかいしよう',
  '{count} of {target} today · tap each color and listen': 'きょう {count}/{target} · いろを タップして きいてね',
  '{count} of {target} today · {colors}': 'きょう {count}/{target} · {colors}',
  '{count} of {target} today · 20 single notes, middle C to high C': 'きょう {count}/{target} · まんなかの ドから たかい ドまで 20こ',
  'NoteSpeller: {notes}': 'おんぷよみ：{notes}',
  'Missed {n} times last time · 20 notes': 'まえかい {n}かい まちがえた · 20こ',
  'All right last time! · 20 notes': 'まえかいは ぜんぶ せいかい！ · 20こ',
  'Sign in': 'サインイン',
  'Part 1 · Pitch practice · then Part 2: Twin practice': 'パート1 · おんかんれんしゅう · つぎは パート2：ふたごれんしゅう',
  // Pitch Practice
  'Listen to the chord': 'わおんを きいてね',
  'Tap the rainbow to hear it': 'にじを タップして きこう',
  'Tap to listen': 'タップして きく',
  'Hear the colors': 'いろを きいてみる',
  'Listen to the chord again?': 'もういちど きく？',
  'Tap to hear again': 'タップして もういちど',
  'What chord did you hear?': 'なにいろの わおんだった？',
  'This is {color}! Remember it': 'これは {color}！ おぼえてね',
  '{a} or {b}?': '{a}？ それとも {b}？',
  'Almost!': 'おしい！',
  "That's {color}!": 'それは {color}！',
  'Great job!': 'すごいね！',
  'Listen to it once more.': 'もういちど きいてみよう。',
  "That's right!": 'せいかい！',
  Finish: 'おわり',
  'Next chord': 'つぎの わおん',
  'Missed last time': 'まえに まちがえた',
  'Mix-up check': 'まちがえチェック',
  "Today's focus:": 'きょうの めあて：',
  'Easy win': 'かんたん',
  'Every chord right!': 'ぜんぶ せいかい！',
  Correct: 'せいかい',
  Wrong: 'まちがい',
  'Day in a row': 'にち れんぞく',
  'Days in a row': 'にち れんぞく',
  'Each color': 'いろごとの せいせき',
  'this round · last time': 'こんかい · まえかい',
  'not this round': 'こんかいは なし',
  'first time': 'はじめて',
  'Recent rounds': 'さいきんの きろく',
  'Superstar!': 'スーパースター！',
  'Almost every chord right.': 'ほとんど ぜんぶ せいかい。',
  'Your ear is getting stronger.': 'みみが どんどん よくなってるよ。',
  'Nice work!': 'よく できたね！',
  'You’re growing, chord by chord.': 'わおん ひとつずつ、せいちょうしてるよ。',
  'Keep going!': 'そのちょうし！',
  'Slow and steady: every round helps.': 'ゆっくりで だいじょうぶ。まいかい ちからに なるよ。',
  '{right} of {total} right for {name}.': '{name}は {total}もん中 {right}もん せいかい。',
  'You earned a sticker! Tap one': 'シールを もらったよ！ ひとつ えらんでね',
  'You have {n} stickers! Tap one': 'シールが {n}まい あるよ！ ひとつ えらんでね',
  'Play again': 'もういちど',
  'All done!': 'おわり！',
  // Melo's Closet
  "Melo's Closet": 'メロの クローゼット',
  Hats: 'ぼうし',
  Glasses: 'メガネ',
  Ribbons: 'リボン',
  'Ta-da! My new {item}!': 'じゃーん！ あたらしい {item}！',
  'Do you like my {item}?': '{item}、にあう？',
  '{n} more stickers for the {item}. Finish a round to get a sticker!': 'あと {n}まいの シールで {item}！ 1かい やると シールが もらえるよ！',
  '{n} more stickers for the {item}. Every round you finish gets a sticker!': 'あと {n}まいの シールで {item}！ 1かい やるごとに シールが もらえるよ！',
  'Get {color} right 9 times out of 10 for its ribbon! Lately: {right} of {total}.': '{color}を 10かいちゅう 9かい あてると リボンが もらえるよ！ さいきん：{total}かいちゅう {right}かい',
  '{color} is a chord you haven’t learned yet. Its ribbon comes later!': '{color}は まだ ならっていない わおんだよ。リボンは もうすこし あとで！',
  'Each color’s ribbon unlocks when you hear that color right 9 times out of 10.': 'いろの リボンは、その いろを 10かいちゅう 9かい あてると もらえるよ。',
  // Explore
  Back: 'もどる',
  'Back to Pitch Practice': 'おんかんれんしゅうに もどる',
  'Tap a pad to play its chord': 'いろを タップすると わおんが なるよ',
  'Ready? Start Pitch Practice': 'じゅんびOK？ おんかんれんしゅうを はじめよう',
  // Tiny Tots
  'Tap a color and listen': 'いろを タップして きいてね',
  // Single Notes
  'What note did you hear?': 'なんの おとだった？',
  'Which color is this chord?': 'この わおんは なにいろ？',
  'Pick the color you hear': 'きこえた いろを えらんでね',
  'Tap the key you hear': 'きこえた けんばんを タップしてね',
  "Yes! That's {name}.": 'せいかい！ {name}だよ。',
  "That's {right}. You picked {picked}.": 'こたえは {right}。えらんだのは {picked}。',
  "That's {right}. You tapped {picked}.": 'こたえは {right}。タップしたのは {picked}。',
  'middle C': 'まんなかの ド',
  'high C': 'たかい ド',
  Next: 'つぎへ',
  '{part} complete!': '{part} おわり！',
  'You got {right} out of {total} right.': '{total}もん中 {right}もん せいかい。',
  // Twin practice
  'Listen to both, one after the other…': 'ふたつを じゅんばんに きいてね…',
  'These two get mixed up most this week. Tap each one to hear it again.': 'こんしゅう いちばん まちがえた 2つだよ。タップすると もういちど きけるよ。',
  'Hear both again': 'ふたつとも もういちど きく',
  'Start: get {n} in a row': 'スタート：{n}れんぞく せいかいしよう',
  'Twin practice · get {n} in a row': 'ふたごれんしゅう · {n}れんぞく せいかいしよう',
  'Listen, count 1, 2, then pick': 'きいて、1、2 と かぞえてから えらんでね',
  "That's {right}. Now hear {other}…": 'こたえは {right}。つぎは {other}を きいてね…',
  '{n} in a row! That\'s {color}.': '{n}れんぞく！ {color}だよ。',
  '{n} in a row!': '{n}れんぞく！',
  'Twin practice done!': 'ふたごれんしゅう おわり！',
  '{a} and {b}: {right} of {total} right.': '{a}と {b}：{total}もん中 {right}もん せいかい。',
  'Best: {best} in a row. {a} and {b} again tomorrow!': 'さいこう {best}れんぞく。{a}と {b}は また あした！',
  // NoteSpeller
  'Tap the key': 'けんばんを タップしてね',
  // Notes on the piano (Type notes)
  'Yes! {notes}': 'せいかい！ {notes}',
  "Now play {color}'s notes": '{color}の おとを ひいてみよう',
};

// The text in the screens' language, with {name}-style blanks filled in.
export function t(en, vars) {
  let s = current === 'ja' && JA[en] != null ? JA[en] : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return s;
}

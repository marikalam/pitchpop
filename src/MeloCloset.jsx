import { useEffect, useState } from 'react';
import Melo from './Melo.jsx';
import Sticker from './Sticker.jsx';
import Icon from './Icon.jsx';
import { playCorrectChime } from './piano.js';
import { newSound } from './soundBus.js';
import { speakWords, speechLanguage } from './speech.js';
import { colorLabel, screenLanguage, t } from './i18n.js';
import { CLOSET_ITEMS, CLOSET_KINDS, closetFor, colorScore, isUnlocked, nextItem, stickerCount, tryOn } from './meloCloset.js';

// Japanese names for the closet's things.
const JA_ITEMS = {
  'party hat': 'パーティーぼうし',
  'round glasses': 'まるメガネ',
  bow: 'リボン',
  'star glasses': 'ほしのメガネ',
  'baseball cap': 'キャップ',
  crown: 'おうかん',
  sunglasses: 'サングラス',
  headphones: 'ヘッドホン',
  'bunny ears': 'うさぎのみみ',
  'heart glasses': 'ハートのメガネ',
  'wizard hat': 'まほうつかいの ぼうし',
  'rainbow ribbon': 'にじいろの リボン',
  'gold ribbon': 'きんいろの リボン',
};
const itemName = (item) =>
  item.color
    ? screenLanguage() === 'ja'
      ? `${colorLabel(item.color)}の リボン`
      : `${colorLabel(item.color)} ribbon`
    : screenLanguage() === 'ja'
      ? JA_ITEMS[item.name] || item.name
      : item.name;

// Melo's Closet (meloCloset.js): tap something unlocked to put it on (tap
// again to take it off); the first time, Melo cheers. Locked things say
// what they need: more stickers, or (a color's ribbon) that color by ear.
// A color's ribbon plays its chord when tapped, the Eguchi way.
export default function MeloCloset({ playerId, playerColors = [], colors = [], engine }) {
  const [closet, setCloset] = useState(() => closetFor(playerId));
  const [count, setCount] = useState(() => stickerCount(playerId));
  const [kind, setKind] = useState('hat');
  const [note, setNote] = useState(null);
  const [cheer, setCheer] = useState(0);
  useEffect(() => {
    const reload = () => setCount(stickerCount(playerId));
    window.addEventListener('pitchpop-stickers-changed', reload);
    return () => window.removeEventListener('pitchpop-stickers-changed', reload);
  }, [playerId]);

  // Said out loud only in English (the Japanese voice is for colors and
  // notes; the words are on screen).
  const say = (line) => {
    setNote(line);
    if (speechLanguage() === 'en') speakWords(line);
  };

  function playColor(item) {
    const c = colors.find((x) => x.name === item.color);
    if (c && engine) {
      newSound();
      engine.playChord(c.notes);
    }
  }

  function tap(item) {
    const name = itemName(item);
    if (isUnlocked(playerId, item, count)) {
      const { closet: after, isNew } = tryOn(playerId, item.id);
      setCloset(after);
      if (item.color) playColor(item);
      if (isNew) {
        if (!item.color) playCorrectChime();
        setCheer((n) => n + 1);
        say(t('Ta-da! My new {item}!', { item: name }));
      } else {
        const on = after.wear[item.kind] === item.id;
        setNote(on ? t('Do you like my {item}?', { item: name }) : null);
      }
      return;
    }
    if (item.color) {
      playColor(item);
      if (!playerColors.includes(item.color)) {
        say(t('{color} is a chord you haven’t learned yet. Its ribbon comes later!', { color: colorLabel(item.color) }));
        return;
      }
      const { right, total } = colorScore(playerId, item.color);
      say(
        t('Get {color} right 9 times out of 10 for its ribbon! Lately: {right} of {total}.', {
          color: colorLabel(item.color),
          right,
          total,
        }),
      );
      return;
    }
    const more = item.need - count;
    say(t('{n} more stickers for the {item}. Finish a round to get a sticker!', { n: more, item: name }));
  }

  const next = nextItem(playerId);
  const items = CLOSET_ITEMS.filter((i) => i.kind === kind);

  return (
    <div className="closet">
      <h2 className="screen-title">{t("Melo's Closet")}</h2>
      <div className="closet-stars" aria-label={`${count} stickers`}>
        <Sticker index={0} size={22} /> {count}
      </div>
      <div className="closet-stage">
        {note && <div className="closet-bubble">{note}</div>}
        <span key={cheer} className={cheer ? 'closet-melo closet-melo-pop' : 'closet-melo'}>
          <Melo size={130} mood={cheer ? 'cheer' : 'wave'} wear={closet.wear} />
        </span>
      </div>
      <div className="closet-tabs" role="tablist">
        {CLOSET_KINDS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            className={`closet-tab${kind === id ? ' closet-tab-on' : ''}`}
            onClick={() => setKind(id)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      {kind === 'ribbon' && <p className="closet-hint">{t('Each color’s ribbon unlocks when you hear that color right 9 times out of 10.')}</p>}
      <div className="closet-grid">
        {items.map((item) => {
          const open = isUnlocked(playerId, item, count);
          const on = closet.wear[item.kind] === item.id;
          const fresh = open && !closet.seen.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={`closet-item${on ? ' closet-item-on' : ''}${open ? (fresh ? ' closet-item-ready' : '') : ' closet-item-locked'}`}
              onClick={() => tap(item)}
              aria-label={`${itemName(item)}${on ? ', wearing' : ''}${open ? '' : ', locked'}`}
            >
              <Melo size={56} wear={{ [item.kind]: item.id }} />
              {item.color && <span className="closet-color-name">{colorLabel(item.color)}</span>}
              {!open &&
                (item.color ? (
                  <span className="closet-price">
                    <Icon name="ear" /> 9/10
                  </span>
                ) : (
                  <span className="closet-price">
                    <Sticker index={0} size={14} /> {item.need}
                  </span>
                ))}
              {fresh && <span className="closet-new">NEW</span>}
            </button>
          );
        })}
      </div>
      {next && (
        <div className="closet-goal">
          <div className="closet-bar">
            <i style={{ width: `${Math.min(100, (count / next.need) * 100)}%` }} />
          </div>
          <span>
            {t('{n} more stickers for the {item}. Every round you finish gets a sticker!', {
              n: next.need - count,
              item: itemName(next),
            })}
          </span>
        </div>
      )}
    </div>
  );
}

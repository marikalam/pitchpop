import { useState } from 'react';
import * as GLYPHS from './theoryGlyphs.js';
import { GLOSSARY, THEORY_CATEGORIES } from './theoryGlossary.js';

// Music Theory: a picture glossary of basic terms, grouped by topic, with
// chips to show one topic at a time.
const SPACE = 20;
const GLYPH_SCALE = SPACE / 250;
// Glyph outlines are in font units: 250 per staff space, 125 per position.
const UNITS_PER_POS = 125;
const MARGIN_POS = 1;

// The highest and lowest staff positions a picture reaches, so each one
// is cropped to its own contents and its symbols fill the picture box.
function verticalRange(picture) {
  const spans = [];
  if (picture.staff) spans.push([8, 0]);
  (picture.glyphs || []).forEach(({ g, pos }) => {
    spans.push([pos - GLYPHS[g].top / UNITS_PER_POS, pos - GLYPHS[g].bottom / UNITS_PER_POS]);
  });
  (picture.ledgers || []).forEach(({ pos }) => spans.push([pos, pos]));
  (picture.hairpins || []).forEach(({ pos }) => spans.push([pos + 2, pos - 2]));
  (picture.curves || []).forEach(({ pos }) => spans.push([pos, pos - 2]));
  const high = Math.max(...spans.map(([h]) => h));
  const low = Math.min(...spans.map(([, l]) => l));
  return [high + MARGIN_POS, low - MARGIN_POS];
}

function TheoryPicture({ picture, label }) {
  const [topPos, bottomPos] = verticalRange(picture);
  const yFor = (pos) => ((topPos - pos) * SPACE) / 2;
  const width = picture.width * SPACE;
  const height = ((topPos - bottomPos) * SPACE) / 2;
  return (
    <svg className="theory-picture" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {picture.staff &&
        [0, 2, 4, 6, 8].map((p) => (
          <line key={p} className="theory-staff-line" x1={SPACE * 0.3} x2={width - SPACE * 0.3} y1={yFor(p)} y2={yFor(p)} />
        ))}
      {(picture.barlines || []).map((x) => (
        <line key={x} className="theory-staff-line" x1={x * SPACE} x2={x * SPACE} y1={yFor(0)} y2={yFor(8)} />
      ))}
      {(picture.ledgers || []).map((l, i) => (
        <line
          key={i}
          className="theory-staff-line"
          x1={(l.x - l.width / 2) * SPACE}
          x2={(l.x + l.width / 2) * SPACE}
          y1={yFor(l.pos)}
          y2={yFor(l.pos)}
        />
      ))}
      {(picture.glyphs || []).map(({ g, x, pos }, i) => (
        <path key={i} className="theory-glyph" d={GLYPHS[g].d} transform={`translate(${x * SPACE} ${yFor(pos)}) scale(${GLYPH_SCALE})`} />
      ))}
      {(picture.hairpins || []).map(({ type, x1, x2, pos }, i) => {
        const [point, open] = type === 'crescendo' ? [x1, x2] : [x2, x1];
        const spread = SPACE * 0.9;
        return (
          <polyline
            key={i}
            className="theory-stroke"
            points={`${open * SPACE},${yFor(pos) - spread} ${point * SPACE},${yFor(pos)} ${open * SPACE},${yFor(pos) + spread}`}
          />
        );
      })}
      {(picture.curves || []).map(({ x1, x2, pos }, i) => {
        const y = yFor(pos);
        const mid = ((x1 + x2) / 2) * SPACE;
        const bow = SPACE * 0.9;
        return (
          <path
            key={i}
            className="theory-stroke"
            d={`M${x1 * SPACE} ${y} Q${mid} ${y + bow} ${x2 * SPACE} ${y}`}
          />
        );
      })}
    </svg>
  );
}

export default function MusicTheory() {
  const [category, setCategory] = useState('all');
  const sections = THEORY_CATEGORIES.filter((c) => category === 'all' || c.id === category);

  return (
    <>
      <h2 className="screen-title">Music Theory</h2>
      <p className="screen-sub">Glossary: what the signs in your music mean</p>

      <div className="theory-chips" role="tablist" aria-label="Topics">
        {[{ id: 'all', label: 'All' }, ...THEORY_CATEGORIES].map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={category === c.id}
            className={`theory-chip${category === c.id ? ' theory-chip-active' : ''}`}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {sections.map((section) => (
        <section key={section.id} className="theory-section" aria-label={section.label}>
          <h3 className="theory-section-title">{section.label}</h3>
          {GLOSSARY.filter((entry) => entry.category === section.id).map((entry) => (
            <article key={entry.id} className="theory-card">
              <div className="theory-picture-box">
                <TheoryPicture picture={entry.picture} label={`Picture of ${entry.term}`} />
              </div>
              <div className="theory-text">
                <h4 className="theory-term">
                  {entry.term}
                  {entry.also && <span className="theory-also"> ({entry.also})</span>}
                </h4>
                <p className="theory-desc">{entry.text}</p>
              </div>
            </article>
          ))}
        </section>
      ))}
    </>
  );
}

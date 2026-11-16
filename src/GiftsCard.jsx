import { useEffect, useMemo, useState } from 'react';
import { loadFamilyAccounts, setPlusGift } from './cloud.js';

// For the owner (Players & colors, stats viewers only): every family
// account by email, with switches to give MathPop Plus and PitchPop
// Family free (supabase/plus_gifts.sql). A gift turns the plan on in
// that app the next time the family opens it, on every device.
export default function GiftsCard() {
  const [rows, setRows] = useState(null);
  const [find, setFind] = useState('');
  const [busy, setBusy] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && rows === null) loadFamilyAccounts().then((r) => setRows(r || []));
  }, [open, rows]);
  const shown = useMemo(() => {
    const q = find.trim().toLowerCase();
    return (rows || []).filter((r) => !q || (r.email || '').toLowerCase().includes(q));
  }, [rows, find]);
  async function toggle(row, app) {
    const key = `${row.id}:${app}`;
    const field = `${app}_gift`;
    const give = !row[field];
    setBusy(key);
    const ok = await setPlusGift(row.id, app, give);
    if (ok) setRows((list) => list.map((r) => (r.id === row.id ? { ...r, [field]: give } : r)));
    setBusy(null);
  }
  const gifted = (rows || []).filter((r) => r.mathpop_gift || r.pitchpop_gift).length;
  return (
    <section className="gift-card" aria-labelledby="gift-title">
      <button type="button" className="gift-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <h3 id="gift-title">Give Plus free</h3>
          <small>Pick a family's email and turn on MathPop Plus or PitchPop Family for free.</small>
        </span>
        <b aria-hidden="true">{open ? '−' : '+'}</b>
      </button>
      {open && (
        <>
          <input className="gift-find" type="search" placeholder="Search emails" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Search emails" />
          {rows === null ? (
            <p className="gift-note">Loading accounts…</p>
          ) : (
            <p className="gift-note">
              {rows.length} family accounts · {gifted} with a free gift
            </p>
          )}
          <ul className="gift-list">
            {shown.map((r) => (
              <li key={r.id} className="gift-row">
                <span className="gift-email">
                  {r.email}
                  <small>
                    Joined {new Date(r.created_at).toLocaleDateString()}
                    {r.mathpop_paid_until && new Date(r.mathpop_paid_until) > new Date() ? ' · paying for Plus' : ''}
                  </small>
                </span>
                <span className="gift-btns">
                  {[
                    ['mathpop', 'MathPop Plus'],
                    ['pitchpop', 'PitchPop Family'],
                  ].map(([app, name]) => (
                    <button key={app} type="button" className={`gift-btn${r[`${app}_gift`] ? ' gift-on' : ''}`} aria-pressed={!!r[`${app}_gift`]} disabled={busy === `${r.id}:${app}`} onClick={() => toggle(r, app)}>
                      {r[`${app}_gift`] ? `${name}: free` : `Give ${name}`}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

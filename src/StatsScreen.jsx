import { useEffect, useState } from 'react';
import { loadStats } from './cloud.js';

// PitchPop stats (Account -> PitchPop stats, for the accounts listed in
// supabase/pitchpop_stats.sql): how much the app is used, added up from
// anonymous events (stats.js). Big numbers first, then one bar chart a
// day, then what's played, then the family accounts.
const RANGES = [7, 30, 90];
const PLATFORM_NAMES = { iphone: 'iPhone', ipad: 'iPad', web: 'Website' };
const LANG_NAMES = { en: 'English', ja: '日本語' };
const ACTIVITY_NAMES = {
  'color-test': 'Pitch Practice',
  tots: 'Tiny Tots',
  notespeller: 'NoteSpeller',
  theory: 'Theory quiz',
  practice: 'Piano practice',
};

function shortDay(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
}

function Tile({ value, label }) {
  return (
    <div className="stats-tile">
      <span className="stats-tile-value">{value}</span>
      <span className="stats-tile-label">{label}</span>
    </div>
  );
}

// Bars for a few named counts, biggest first, each with its number.
function BarList({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="stats-card">
      <h3 className="stats-card-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="stats-empty">Nothing yet</p>
      ) : (
        <ul className="stats-bars">
          {rows.map((r) => (
            <li key={r.label} className="stats-bar-row">
              <span className="stats-bar-label">{r.label}</span>
              <span className="stats-bar-track">
                <span className="stats-bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
              </span>
              <span className="stats-bar-value">
                {r.value}
                {r.note && <span className="stats-bar-note"> · {r.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function shortDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '–';
}

// The family accounts: email, when they joined, last sign-in, players.
function Families({ families }) {
  return (
    <section className="stats-card">
      <h3 className="stats-card-title">Family accounts ({families.length})</h3>
      {families.length === 0 ? (
        <p className="stats-empty">Nothing yet</p>
      ) : (
        <ul className="stats-families">
          {families.map((f) => (
            <li key={f.email} className="stats-family">
              <span className="stats-family-email">{f.email}</span>
              <span className="stats-family-meta">
                Joined {shortDate(f.joined)} · last in {shortDate(f.lastSignIn)} · {f.players}{' '}
                {f.players === 1 ? 'player' : 'players'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function sortedRows(obj, names = {}) {
  return Object.entries(obj || {})
    .map(([k, v]) => ({ label: names[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);
}

export default function StatsScreen() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(undefined);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    let live = true;
    setStats(undefined);
    loadStats(days).then((s) => live && setStats(s));
    return () => {
      live = false;
    };
  }, [days]);

  const t = stats?.totals;
  const daily = stats?.daily || [];
  const maxDevices = Math.max(1, ...daily.map((d) => d.devices));
  const shown = hover ?? daily.length - 1;

  return (
    <div className="stats-screen">
      <div className="stats-range" role="radiogroup" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={days === r}
            className={`stats-range-btn${days === r ? ' stats-range-btn-active' : ''}`}
            onClick={() => setDays(r)}
          >
            {r} days
          </button>
        ))}
      </div>

      {stats === undefined && <p className="screen-sub">Loading…</p>}
      {stats === null && (
        <p className="screen-sub">
          Couldn’t load the stats. Check the internet connection, and that supabase/pitchpop_stats.sql has been run.
        </p>
      )}

      {t && (
        <>
          <div className="stats-tiles">
            <Tile
              value={Math.round((t.activeDays / (stats.daily?.length || days)) * 10) / 10}
              label="devices a day (average)"
            />
            <Tile value={t.newInstalls} label="new devices" />
            <Tile value={t.rounds} label="rounds played" />
            <Tile value={t.answered ? `${Math.round((t.correct / t.answered) * 100)}%` : '–'} label="answered right" />
          </div>
          <p className="stats-note">
            {stats.allTimeInstalls} {stats.allTimeInstalls === 1 ? 'device' : 'devices'} since stats began. The numbers
            don’t say who anyone is.
          </p>

          <section className="stats-card">
            <h3 className="stats-card-title">Devices using PitchPop each day</h3>
            {daily[shown] && (
              <p className="stats-chart-readout">
                <strong>{shortDay(daily[shown].day)}</strong> · {daily[shown].devices}{' '}
                {daily[shown].devices === 1 ? 'device' : 'devices'} · {daily[shown].rounds}{' '}
                {daily[shown].rounds === 1 ? 'round' : 'rounds'}
                {daily[shown].newInstalls > 0 && ` · ${daily[shown].newInstalls} new`}
              </p>
            )}
            <div className="stats-chart" onMouseLeave={() => setHover(null)}>
              {daily.map((d, i) => (
                <button
                  key={d.day}
                  type="button"
                  className={`stats-col${i === shown ? ' stats-col-on' : ''}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                  aria-label={`${shortDay(d.day)}: ${d.devices} devices, ${d.rounds} rounds`}
                >
                  <span className="stats-col-fill" style={{ height: `${(d.devices / maxDevices) * 100}%` }} />
                </button>
              ))}
            </div>
            <div className="stats-axis">
              <span>{daily[0] && shortDay(daily[0].day)}</span>
              <span>Today</span>
            </div>
          </section>

          <BarList
            title="iPhone, iPad or website (devices a day, added up)"
            rows={sortedRows(stats.platforms, PLATFORM_NAMES)}
          />
          <BarList
            title="Most played"
            rows={(stats.activities || []).map((x) => ({
              label: ACTIVITY_NAMES[x.activity] || x.activity,
              value: x.rounds,
              note: x.answered ? `${Math.round((x.correct / x.answered) * 100)}% right` : null,
            }))}
          />
          <BarList title="Language" rows={sortedRows(stats.languages, LANG_NAMES)} />
          <Families families={stats.families || []} />
        </>
      )}
    </div>
  );
}

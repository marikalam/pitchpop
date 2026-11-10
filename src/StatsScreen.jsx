import { useEffect, useState } from "react";
import { loadAppleSales, loadMoneyProgress, loadStats, loadStoreStats } from "./cloud.js";

// PitchPop stats (Account -> PitchPop stats, for the accounts listed in
// supabase/pitchpop_stats.sql): how much the app is used, added up from
// anonymous events (stats.js). Big numbers first, then one bar chart a
// day, then what's played, then the family accounts.
const RANGES = [7, 30, 90];
const PLATFORM_NAMES = { iphone: "iPhone", ipad: "iPad", web: "Website" };
const LANG_NAMES = { en: "English", ja: "日本語" };
const ACTIVITY_NAMES = {
  "color-test": "Pitch Practice",
  tots: "Tiny Tots",
  "single-notes": "Single Notes",
  twins: "Twin practice",
  notespeller: "NoteSpeller",
  theory: "Theory quiz",
  practice: "Piano practice",
};

// For Players & colors (only shown to the accounts that can see the
// stats): all-time downloads and accounts, and a way to the full stats.
export function DownloadsCard({ onOpenStats }) {
  const [stats, setStats] = useState(undefined);
  useEffect(() => {
    let live = true;
    loadStats(7).then((s) => live && setStats(s));
    return () => {
      live = false;
    };
  }, []);
  if (stats === null) return null;
  const all = stats?.allTime;
  // Older database function (before allTime): what it does say.
  const app = all ? all.appInstalls : stats?.allTimeInstalls;
  const families = all ? all.families : stats?.families?.length;
  const dash = stats === undefined ? "…" : "–";
  return (
    <section className="stats-card downloads-card">
      <h3 className="stats-card-title">Downloads</h3>
      <div className="stats-tiles">
        <Tile
          value={app ?? dash}
          label={
            all ? "app downloads (iPhone & iPad)" : "downloads (app & website)"
          }
        />
        {all && <Tile value={all.webVisitors} label="website visitors" />}
        {all && <Tile value={all.accounts} label="accounts" />}
        <Tile value={families ?? dash} label="families with players" />
      </div>
      <p className="stats-note">
        Since stats began (Oct 26). A download is PitchPop opened for the first
        time on a device, TestFlight included.
      </p>
      {onOpenStats && (
        <button
          type="button"
          className="pill-btn-secondary pill-btn-full"
          onClick={onOpenStats}
        >
          See all stats
        </button>
      )}
    </section>
  );
}

// Money by currency ({ USD: 4.24, EUR: 1.2 }): US dollars first.
function money(byCurrency = {}) {
  const entries = Object.entries(byCurrency).filter(([, v]) => Number(v));
  if (!entries.length) return "$0";
  entries.sort(([a], [b]) => (a === "USD" ? -1 : b === "USD" ? 1 : 0));
  return entries
    .map(([cur, v]) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur,
        maximumFractionDigits: 2,
      }).format(Number(v)),
    )
    .join(" + ");
}

// Apple's own numbers for PitchPop (App Store Connect's daily sales
// reports, supabase/apple_sales.sql): downloads and money earned. On the
// stats page and in Players & colors, only for the owner. `full` adds the
// day-by-day chart and the countries.
export function AppleCard({ full = false }) {
  const [apps, setApps] = useState(undefined);
  useEffect(() => {
    let live = true;
    loadAppleSales().then((a) => live && setApps(a));
    return () => {
      live = false;
    };
  }, []);
  if (apps === null) return null;
  const app = apps?.find((a) => /pitch/i.test(a.title || ""));
  if (!app) {
    return full && apps !== undefined ? (
      <section className="stats-card apple-card">
        <h3 className="stats-card-title">From Apple (App Store)</h3>
        <p className="stats-note">
          Apple’s downloads and money earned show here once the daily report is
          set up and runs.
        </p>
      </section>
    ) : null;
  }
  const daily = app.daily || [];
  const max = Math.max(1, ...daily.map((d) => d.downloads));
  return (
    <section className="stats-card apple-card">
      <h3 className="stats-card-title">From Apple (App Store)</h3>
      <div className="stats-tiles">
        <Tile value={app.allTime.downloads} label="downloads, all time" />
        <Tile value={app.last30.downloads} label="downloads, last 30 days" />
        <Tile value={money(app.allTime.proceeds)} label="earned, all time" />
        <Tile value={money(app.last30.proceeds)} label="earned, last 30 days" />
      </div>
      <p className="stats-note">
        {app.allTime.purchases}{" "}
        {app.allTime.purchases === 1 ? "purchase" : "purchases"} ·{" "}
        {app.allTime.redownloads} re-downloads. Money is what Apple pays you,
        after its cut. Through {shortDay(app.lastDay)}; Apple’s reports are a
        day behind.
      </p>
      {full && daily.length > 1 && (
        <>
          <div
            className="stats-chart apple-chart"
            aria-label="Downloads each day"
          >
            {daily.map((d) => (
              <span
                key={d.day}
                className="stats-col"
                title={`${shortDay(d.day)}: ${d.downloads}`}
              >
                <span
                  className="stats-col-fill"
                  style={{ height: `${(d.downloads / max) * 100}%` }}
                />
              </span>
            ))}
          </div>
          <div className="stats-axis">
            <span>{shortDay(daily[0].day)}</span>
            <span>{shortDay(daily[daily.length - 1].day)}</span>
          </div>
        </>
      )}
      {full && Object.keys(app.countries || {}).length > 0 && (
        <BarList
          title="Downloads by country"
          rows={Object.entries(app.countries)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)}
        />
      )}
    </section>
  );
}

function shortDay(iso) {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

function Tile({ value, label, wide = false }) {
  return (
    <div className={`stats-tile${wide ? " stats-tile-wide" : ""}`}>
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
                <span
                  className="stats-bar-fill"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
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

const REGION_NAMES =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
const countryName = (code) => {
  try {
    return REGION_NAMES?.of(code) || code;
  } catch {
    return code;
  }
};
const longDay = (iso) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "–";

// "App Store (from Apple)" for the chosen range, laid out like MathPop's:
// downloads, re-downloads, the store page (not connected yet), money
// earned, then downloads by country.
function StoreCard({ days }) {
  const [store, setStore] = useState(undefined);
  useEffect(() => {
    let live = true;
    setStore(undefined);
    loadStoreStats(days).then((s) => live && setStore(s));
    return () => {
      live = false;
    };
  }, [days]);
  if (store === null) return null;
  const t = store?.totals;
  const dash = store === undefined ? "…" : "–";
  return (
    <>
      <section className="stats-card apple-card">
        <h3 className="stats-card-title">App Store (from Apple)</h3>
        <div className="stats-tiles">
          <Tile value={t?.download ?? dash} label="downloads" />
          <Tile value={t?.redownload ?? dash} label="redownloads" />
          <Tile value="–" label="saw it in the App Store" />
          <Tile value="–" label="opened its page" />
          <Tile value={store ? money(store.proceeds) : dash} label="earned" />
          <Tile value={t?.purchase ?? dash} label="purchases" />
          <Tile value="–" label="page → download" wide />
        </div>
        <p className="stats-note">
          Last {days} days, up to {longDay(store?.through)}.{" "}
          {store?.allTime?.download ?? 0} downloads and{" "}
          {store ? money(store.proceedsAllTime) : "$0"} earned in all. Apple’s
          numbers run a day or two behind. Money is what Apple pays you, after
          its cut.
        </p>
      </section>
      <BarList
        title="Downloads by country"
        rows={(store?.countries || []).map((c) => ({
          label: countryName(c.territory),
          value: c.downloads,
        }))}
      />
    </>
  );
}

function shortDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "–";
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
                Joined {shortDate(f.joined)} · last in {shortDate(f.lastSignIn)}{" "}
                · {f.players} {f.players === 1 ? "player" : "players"}
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

// The one number to watch, at the top: how many kids play PitchPop each
// day (devices that opened it): today so far, compared with yesterday,
// and the last DAYS days as bars (tap one for its number). Below it, this
// week's path: new downloads -> family sign-ups -> paying families.
const DAYS = 30;

function ProgressCard() {
  const [stats, setStats] = useState(undefined);
  const [money, setMoney] = useState(undefined);
  const [pick, setPick] = useState(null);
  useEffect(() => {
    let live = true;
    loadStats(DAYS).then((s) => live && setStats(s));
    loadMoneyProgress().then((m) => live && setMoney(m));
    return () => {
      live = false;
    };
  }, []);
  if (stats === null) return null;
  if (stats === undefined) return <section className="stats-card progress-card"><p className="stats-empty">Loading…</p></section>;
  const daily = (stats.daily || []).slice(-DAYS);
  if (!daily.length) return null;
  const today = daily[daily.length - 1];
  const yesterday = daily[daily.length - 2];
  const weekAgo = daily[daily.length - 8];
  const max = Math.max(1, ...daily.map((d) => d.devices));
  const shown = daily[pick ?? daily.length - 1];
  const week = daily.slice(-7);
  const weekStart = week[0].day;
  const weekInstalls = week.reduce((n, d) => n + d.newInstalls, 0);
  const signups = (stats.families || []).filter((f) => f.joined && f.joined.slice(0, 10) >= weekStart).length;
  const paying = money?.paying?.pitchpop;
  return (
    <section className="stats-card progress-card">
      <h3 className="stats-card-title">Kids playing each day</h3>
      <div className="progress-big">
        <span className="progress-num">{today.devices}</span>
        <span className="progress-today">today so far</span>
      </div>
      <p className="progress-sub">
        Yesterday: <strong>{yesterday ? yesterday.devices : "–"}</strong>
        {weekAgo && (
          <>
            {" · "}Same day last week: <strong>{weekAgo.devices}</strong>
          </>
        )}
      </p>
      <div className="progress-chart progress-chart-days" onMouseLeave={() => setPick(null)}>
        {daily.map((d, i) => (
          <button
            key={d.day}
            type="button"
            className={`progress-bar${shown === d ? " progress-bar-on" : ""}`}
            onClick={() => setPick(i)}
            onMouseEnter={() => setPick(i)}
            aria-label={`${shortDay(d.day)}: ${d.devices} playing`}
          >
            <span style={{ height: `${Math.max(3, (d.devices / max) * 100)}%` }} />
          </button>
        ))}
      </div>
      <div className="stats-axis">
        <span>{shortDay(daily[0].day)}</span>
        <span>
          {shown === today ? "Today" : shortDay(shown.day)}: <strong>{shown.devices}</strong> playing
          {shown.newInstalls > 0 && ` · ${shown.newInstalls} new`}
        </span>
      </div>
      <div className="progress-funnel">
        <span className="progress-funnel-title">Last 7 days</span>
        <span className="progress-step"><strong>{weekInstalls}</strong> new downloads</span>
        <span className="progress-arrow">→</span>
        <span className="progress-step"><strong>{signups}</strong> signed up</span>
        <span className="progress-arrow">→</span>
        <span className="progress-step"><strong>{paying ?? "–"}</strong> paying</span>
      </div>
    </section>
  );
}

export default function StatsScreen() {
  const [days, setDays] = useState(7);
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
      <ProgressCard />
      {/* Everything else, folded away. */}
      <details className="stats-more">
        <summary>More numbers</summary>
      <div className="stats-range" role="radiogroup" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={days === r}
            className={`stats-range-btn${days === r ? " stats-range-btn-active" : ""}`}
            onClick={() => setDays(r)}
          >
            {r} days
          </button>
        ))}
      </div>

      {stats === undefined && <p className="screen-sub">Loading…</p>}
      {stats === null && (
        <p className="screen-sub">
          Couldn’t load the stats. Check the internet connection, and that
          supabase/pitchpop_stats.sql has been run.
        </p>
      )}

      {t && (
        <>
          <div className="stats-tiles">
            <Tile
              value={
                Math.round(
                  (t.activeDays / (stats.daily?.length || days)) * 10,
                ) / 10
              }
              label="devices a day (average)"
            />
            <Tile value={t.newInstalls} label="new devices" />
            <Tile
              value={
                (stats.families || []).filter(
                  (f) => f.joined && f.joined.slice(0, 10) >= stats.since,
                ).length
              }
              label="new sign-ups"
            />
            <Tile value={t.rounds} label="rounds played" />
            <Tile
              value={
                t.answered
                  ? `${Math.round((t.correct / t.answered) * 100)}%`
                  : "–"
              }
              label="answered right"
              wide
            />
          </div>
          <p className="stats-note">
            {stats.allTimeInstalls}{" "}
            {stats.allTimeInstalls === 1 ? "device" : "devices"} since stats
            began. The usage counts are anonymous; only the family accounts list
            below shows emails.
          </p>

          <StoreCard days={days} />

          <section className="stats-card">
            <h3 className="stats-card-title">
              Devices using PitchPop each day
            </h3>
            {daily[shown] && (
              <p className="stats-chart-readout">
                <strong>{shortDay(daily[shown].day)}</strong> ·{" "}
                {daily[shown].devices}{" "}
                {daily[shown].devices === 1 ? "device" : "devices"} ·{" "}
                {daily[shown].rounds}{" "}
                {daily[shown].rounds === 1 ? "round" : "rounds"}
                {daily[shown].newInstalls > 0 &&
                  ` · ${daily[shown].newInstalls} new`}
              </p>
            )}
            <div className="stats-chart" onMouseLeave={() => setHover(null)}>
              {daily.map((d, i) => (
                <button
                  key={d.day}
                  type="button"
                  className={`stats-col${i === shown ? " stats-col-on" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                  aria-label={`${shortDay(d.day)}: ${d.devices} devices, ${d.rounds} rounds`}
                >
                  <span
                    className="stats-col-fill"
                    style={{ height: `${(d.devices / maxDevices) * 100}%` }}
                  />
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
              note: x.answered
                ? `${Math.round((x.correct / x.answered) * 100)}% right`
                : null,
            }))}
          />
          <BarList
            title="Language"
            rows={sortedRows(stats.languages, LANG_NAMES)}
          />
          <Families families={stats.families || []} />
        </>
      )}
      </details>
    </div>
  );
}

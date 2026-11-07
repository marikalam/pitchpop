import { useEffect, useState } from 'react';
import { loadMoneyProgress } from './cloud.js';

// Downloads and money progress, only for the owner (the accounts that can
// see the stats; supabase/money_progress.sql in MathPop's repo). The same
// card is in MathPop (Players & grades) and PitchPop (Players & colors),
// each showing its own app first: all-time downloads, then since the paid
// plan started, how many are still in their free week, how many finished
// it, and how many families pay (the family plan covers both apps).
const NAMES = { mathpop: 'MathPop', pitchpop: 'PitchPop' };

function Tile({ value, label, strong = false }) {
  return (
    <div className={strong ? 'stats-tile money-tile-strong' : 'stats-tile'}>
      <span className="stats-tile-value">{value}</span>
      <span className="stats-tile-label">{label}</span>
    </div>
  );
}

function shortDate(iso) {
  if (!iso) return '–';
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
}

export default function MoneyCard({ app }) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    let live = true;
    loadMoneyProgress().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, []);
  if (data === null) return null;
  const a = data?.[app];
  const paying = data?.paying;
  const dash = data === undefined ? '…' : '–';
  const appPaying = paying ? paying[app] : null;
  const rate = a && paying && a.trialDone ? `${Math.round((appPaying / a.trialDone) * 100)}%` : '–';
  const other = app === 'mathpop' ? 'pitchpop' : 'mathpop';
  return (
    <section className="stats-card money-card">
      <h3 className="stats-card-title">Downloads &amp; money · just for you</h3>
      <div className="stats-tiles">
        <Tile value={a?.allDownloads ?? dash} label="downloads, all time (iPhone & iPad)" />
        <Tile value={a?.downloads ?? dash} label={`downloads since paid started (${shortDate(a?.paidSince)})`} />
        <Tile value={a?.inTrial ?? dash} label="in their free week (last 7 days)" />
        <Tile value={a?.trialDone ?? dash} label="free week over" />
        <Tile value={appPaying ?? dash} label={`paying in ${NAMES[app]}`} strong />
        <Tile value={rate} label="free week → paying" strong />
      </div>
      {paying && (
        <p className="stats-note">
          Both apps: <strong>{paying.families}</strong> paying {paying.families === 1 ? 'family' : 'families'} ({paying.monthly} monthly,{' '}
          {paying.yearly} yearly, {paying.lifetime} lifetime; {paying[other]} through {NAMES[other]}). {a?.accounts ?? 0} family accounts made
          since paid started; {a?.founders ?? 0} founding accounts keep {NAMES[app]} free.
        </p>
      )}
      {app === 'pitchpop' && (
        <p className="stats-note">PitchPop purchases go through RevenueCat, so check its dashboard for PitchPop sales too.</p>
      )}
      <p className="stats-note">A download is the app opened for the first time on a device, TestFlight included. App Store purchases only.</p>
    </section>
  );
}

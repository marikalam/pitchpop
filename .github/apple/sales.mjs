// Apple's daily sales reports (downloads, re-downloads, updates, in-app
// purchases, money earned) for every app in the App Store Connect account,
// sent to the private apple_sales_daily table (supabase/apple_sales.sql)
// for the owner's stats. Run by apple-stats.yml.
//
// This repository is public, so its Actions logs are too: this prints
// only how many days were saved, never any numbers.
//
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, APPLE_STATS_TOKEN, DAYS.
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, APPLE_STATS_TOKEN } = process.env;
const DAYS = Math.min(365, Math.max(1, Number(process.env.DAYS) || 10));
const API = 'https://api.appstoreconnect.apple.com';
// Public values (they're in the app too).
const SUPABASE_URL = 'https://wtjhceycjiowvdpfwkjj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hcaechWMVkIchjiS_BGQjg_E8N1XHA1';

if (!APPLE_STATS_TOKEN) {
  console.log('APPLE_STATS_TOKEN is not set in GitHub yet (Settings -> Secrets and variables -> Actions).');
  process.exit(0);
}

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64url({ iss: ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const key = createPrivateKey(readFileSync(ASC_KEY_PATH, 'utf8'));
  return `${head}.${body}.${sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

async function rpc(name, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${name} -> ${res.status}`);
  return res.json();
}

const vendor = await rpc('apple_sales_vendor', { token: APPLE_STATS_TOKEN });
if (!vendor) {
  console.log('No vendor number yet (or the token does not match): see supabase/apple_sales.sql.');
  process.exit(0);
}

// The account's apps: Apple ID -> { title, sku }.
const appsRes = await fetch(`${API}/v1/apps?limit=200&fields[apps]=name,sku`, { headers: { Authorization: `Bearer ${token()}` } });
if (!appsRes.ok) throw new Error(`apps -> ${appsRes.status}`);
const apps = new Map((await appsRes.json()).data.map((a) => [a.id, { title: a.attributes.name, sku: a.attributes.sku }]));
const bySku = new Map([...apps].map(([id, a]) => [a.sku, id]));

const FIRST = new Set(['1', '1F', '1T', '1E', '1EP', '1EU', 'F1']);
const AGAIN = new Set(['3', '3F', '3T', 'F3']);
const UPDATE = new Set(['7', '7F', '7T', 'F7']);

async function report(day) {
  const q = new URLSearchParams({
    'filter[frequency]': 'DAILY',
    'filter[reportDate]': day,
    'filter[reportSubType]': 'SUMMARY',
    'filter[reportType]': 'SALES',
    'filter[vendorNumber]': vendor,
    'filter[version]': '1_0',
  });
  const res = await fetch(`${API}/v1/salesReports?${q}`, { headers: { Authorization: `Bearer ${token()}`, Accept: 'application/a-gzip' } });
  if (res.status === 404) return []; // no sales that day (or not ready yet)
  if (res.status === 403) throw new Error('The App Store Connect key needs the Sales (or Finance) role for sales reports.');
  if (!res.ok) throw new Error(`sales report ${day} -> ${res.status}`);
  const lines = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8').trim().split('\n');
  const head = lines.shift().split('\t');
  return lines.map((l) => Object.fromEntries(l.split('\t').map((v, i) => [head[i], v])));
}

const rows = [];
let missing = 0;
for (let i = 1; i <= DAYS; i++) {
  const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
  let lines;
  try {
    lines = await report(day);
  } catch (e) {
    if (String(e.message).includes('Sales')) throw e;
    missing += 1;
    continue;
  }
  const per = new Map([...apps.keys()].map((id) => [id, { downloads: 0, redownloads: 0, updates: 0, purchases: 0, proceeds: {}, countries: {} }]));
  for (const r of lines) {
    const type = r['Product Type Identifier'];
    const units = Number(r.Units) || 0;
    const appId = apps.has(r['Apple Identifier']) ? r['Apple Identifier'] : bySku.get(r['Parent Identifier']);
    const p = appId && per.get(appId);
    if (!p) continue;
    if (FIRST.has(type)) {
      p.downloads += units;
      p.countries[r['Country Code']] = (p.countries[r['Country Code']] || 0) + units;
    } else if (AGAIN.has(type)) p.redownloads += units;
    else if (UPDATE.has(type)) p.updates += units;
    else if (r['Parent Identifier']) p.purchases += units;
    const money = (Number(r['Developer Proceeds']) || 0) * units;
    if (money) {
      const cur = r['Currency of Proceeds'];
      p.proceeds[cur] = Math.round(((p.proceeds[cur] || 0) + money) * 100) / 100;
    }
  }
  for (const [appleId, p] of per) rows.push({ appleId, title: apps.get(appleId).title, day, ...p });
}

const saved = rows.length ? await rpc('apple_sales_ingest', { token: APPLE_STATS_TOKEN, rows }) : 0;
console.log(`Saved ${saved} app-day rows for the last ${DAYS} days${missing ? ` (${missing} days not available)` : ''}.`);

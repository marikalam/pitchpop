// Makes PitchPop Family's in-app purchases in App Store Connect through
// the API (run by products.yml): the "PitchPop Family" subscription group
// with Monthly and Yearly (each with a free week), and a one-time
// Lifetime unlock. Prices are set in the US and matched by Apple in every
// other country. Safe to run again: anything already there is kept.
//
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (the .p8).
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BUNDLE_ID = 'com.marikalam.pitchpop';
const API = 'https://api.appstoreconnect.apple.com';
const SCREENSHOT = new URL('./review-paywall.png', import.meta.url);
const REVIEW_NOTE =
  'PitchPop Family unlocks every color, NoteSpeller, Scales, Hanon, the Progress page and more players. ' +
  'Open the menu > PitchPop Family (or tap any ⭐ tool), answer the grown-up question, then pick a plan.';
const DESCRIPTION = 'Every color, NoteSpeller, Scales and the whole family';

const SUBSCRIPTIONS = [
  { productId: 'pitchpop_yearly', name: 'PitchPop Family Yearly', period: 'ONE_YEAR', price: '29.99', level: 1 },
  { productId: 'pitchpop_monthly', name: 'PitchPop Family Monthly', period: 'ONE_MONTH', price: '4.99', level: 2 },
];
const LIFETIME = { productId: 'pitchpop_lifetime', name: 'PitchPop Family Lifetime', price: '59.99' };

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH } = process.env;
const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64url({ iss: ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const key = createPrivateKey(readFileSync(ASC_KEY_PATH, 'utf8'));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}

async function api(method, path, data, included) {
  const res = await fetch(path.startsWith('http') ? path : API + path, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(included ? { data, included } : { data }) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text}`);
  return text ? JSON.parse(text) : {};
}

// Every page of a list.
async function all(path) {
  const out = { data: [], included: [] };
  let next = path;
  while (next) {
    const page = await api('GET', next);
    out.data.push(...page.data);
    out.included.push(...(page.included || []));
    next = page.links?.next;
  }
  return out;
}

const rel = (type, id) => ({ data: { type, id } });

async function uploadScreenshot(type, relName, relType, ownerId, existing) {
  if (existing) return console.log('  review screenshot: already there');
  const bytes = readFileSync(SCREENSHOT);
  const shot = (
    await api('POST', `/v1/${type}`, {
      type,
      attributes: { fileName: 'review-paywall.png', fileSize: bytes.length },
      relationships: { [relName]: rel(relType, ownerId) },
    })
  ).data;
  for (const op of shot.attributes.uploadOperations) {
    const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
    const res = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
    if (!res.ok) throw new Error(`Screenshot upload -> ${res.status}`);
  }
  await api('PATCH', `/v1/${type}/${shot.id}`, {
    type,
    id: shot.id,
    attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(bytes).digest('hex') },
  });
  console.log('  review screenshot: uploaded');
}

const app = (await api('GET', `/v1/apps?filter[bundleId]=${BUNDLE_ID}`)).data[0];
if (!app) throw new Error(`No app with bundle ID ${BUNDLE_ID}`);
console.log(`App: ${app.attributes.name} (${app.id})`);
const territories = (await all('/v1/territories?limit=200')).data.map((t) => ({ type: 'territories', id: t.id }));
console.log(`${territories.length} countries or regions`);

// ---- Subscriptions ----
let group = (await api('GET', `/v1/apps/${app.id}/subscriptionGroups?limit=50`)).data.find(
  (g) => g.attributes.referenceName === 'PitchPop Family',
);
if (!group) {
  group = (
    await api('POST', '/v1/subscriptionGroups', {
      type: 'subscriptionGroups',
      attributes: { referenceName: 'PitchPop Family' },
      relationships: { app: rel('apps', app.id) },
    })
  ).data;
  await api('POST', '/v1/subscriptionGroupLocalizations', {
    type: 'subscriptionGroupLocalizations',
    attributes: { name: 'PitchPop Family', locale: 'en-US' },
    relationships: { subscriptionGroup: rel('subscriptionGroups', group.id) },
  });
  console.log('Made the PitchPop Family subscription group');
}

const existingSubs = (await api('GET', `/v1/subscriptionGroups/${group.id}/subscriptions?limit=50`)).data;
for (const s of SUBSCRIPTIONS) {
  console.log(`${s.name} (${s.productId})`);
  let sub = existingSubs.find((x) => x.attributes.productId === s.productId);
  if (!sub) {
    sub = (
      await api('POST', '/v1/subscriptions', {
        type: 'subscriptions',
        attributes: {
          name: s.name,
          productId: s.productId,
          subscriptionPeriod: s.period,
          familySharable: true,
          reviewNote: REVIEW_NOTE,
          groupLevel: s.level,
        },
        relationships: { group: rel('subscriptionGroups', group.id) },
      })
    ).data;
    console.log('  made');
  }

  const locs = (await api('GET', `/v1/subscriptions/${sub.id}/subscriptionLocalizations`)).data;
  if (!locs.length) {
    await api('POST', '/v1/subscriptionLocalizations', {
      type: 'subscriptionLocalizations',
      attributes: { name: s.name, locale: 'en-US', description: DESCRIPTION },
      relationships: { subscription: rel('subscriptions', sub.id) },
    });
    console.log('  name and description: set');
  }

  // Availability everywhere.
  try {
    await api('POST', '/v1/subscriptionAvailabilities', {
      type: 'subscriptionAvailabilities',
      attributes: { availableInNewTerritories: true },
      relationships: { subscription: rel('subscriptions', sub.id), availableTerritories: { data: territories } },
    });
    console.log('  available in every country');
  } catch (e) {
    console.log(`  availability: ${e.message.split('\n')[0]}`);
  }

  // The price: the US one, and Apple's matching price in every other country.
  const prices = (await api('GET', `/v1/subscriptions/${sub.id}/prices?limit=1`)).data;
  if (!prices.length) {
    const usPoints = await all(`/v1/subscriptions/${sub.id}/pricePoints?filter[territory]=USA&limit=200`);
    const point = usPoints.data.find((p) => p.attributes.customerPrice === s.price);
    if (!point) throw new Error(`No $${s.price} price point`);
    const equal = await all(`/v1/subscriptionPricePoints/${point.id}/equalizations?include=territory&limit=200`);
    const points = [{ id: point.id, territory: 'USA' }, ...equal.data.map((p) => ({ id: p.id, territory: p.relationships.territory.data.id }))];
    let done = 0;
    for (const p of points) {
      try {
        await api('POST', '/v1/subscriptionPrices', {
          type: 'subscriptionPrices',
          attributes: { preserveCurrentPrice: false },
          relationships: {
            subscription: rel('subscriptions', sub.id),
            subscriptionPricePoint: rel('subscriptionPricePoints', p.id),
            territory: rel('territories', p.territory),
          },
        });
        done += 1;
      } catch (e) {
        console.log(`  price in ${p.territory}: ${e.message.split('\n')[0]}`);
      }
    }
    console.log(`  price $${s.price}: set in ${done} countries`);
  } else {
    console.log('  price: already set');
  }

  // A free week to start.
  const offers = (await api('GET', `/v1/subscriptions/${sub.id}/introductoryOffers?limit=1`)).data;
  if (!offers.length) {
    let done = 0;
    for (const t of territories) {
      try {
        await api('POST', '/v1/subscriptionIntroductoryOffers', {
          type: 'subscriptionIntroductoryOffers',
          attributes: { duration: 'ONE_WEEK', offerMode: 'FREE_TRIAL', numberOfPeriods: 1 },
          relationships: { subscription: rel('subscriptions', sub.id), territory: rel('territories', t.id) },
        });
        done += 1;
      } catch (e) {
        if (!done) console.log(`  free week in ${t.id}: ${e.message.split('\n')[0]}`);
      }
    }
    console.log(`  free week: set in ${done} countries`);
  } else {
    console.log('  free week: already set');
  }

  const shot = await api('GET', `/v1/subscriptions/${sub.id}/appStoreReviewScreenshot`).catch(() => ({}));
  await uploadScreenshot('subscriptionAppStoreReviewScreenshots', 'subscription', 'subscriptions', sub.id, shot.data);
}

// ---- Lifetime ----
console.log(`${LIFETIME.name} (${LIFETIME.productId})`);
let iap = (await api('GET', `/v1/apps/${app.id}/inAppPurchasesV2?filter[productId]=${LIFETIME.productId}`)).data[0];
if (!iap) {
  iap = (
    await api('POST', '/v2/inAppPurchases', {
      type: 'inAppPurchases',
      attributes: {
        name: LIFETIME.name,
        productId: LIFETIME.productId,
        inAppPurchaseType: 'NON_CONSUMABLE',
        reviewNote: REVIEW_NOTE,
        familySharable: true,
      },
      relationships: { app: rel('apps', app.id) },
    })
  ).data;
  console.log('  made');
}

const iapLocs = (await api('GET', `/v2/inAppPurchases/${iap.id}/inAppPurchaseLocalizations`)).data;
if (!iapLocs.length) {
  await api('POST', '/v1/inAppPurchaseLocalizations', {
    type: 'inAppPurchaseLocalizations',
    attributes: { name: LIFETIME.name, locale: 'en-US', description: DESCRIPTION },
    relationships: { inAppPurchaseV2: rel('inAppPurchases', iap.id) },
  });
  console.log('  name and description: set');
}

try {
  await api('POST', '/v1/inAppPurchaseAvailabilities', {
    type: 'inAppPurchaseAvailabilities',
    attributes: { availableInNewTerritories: true },
    relationships: { inAppPurchase: rel('inAppPurchases', iap.id), availableTerritories: { data: territories } },
  });
  console.log('  available in every country');
} catch (e) {
  console.log(`  availability: ${e.message.split('\n')[0]}`);
}

const schedule = await api('GET', `/v2/inAppPurchases/${iap.id}/iapPriceSchedule?include=manualPrices`).catch(() => null);
if (!schedule?.included?.length) {
  const usPoints = await all(`/v2/inAppPurchases/${iap.id}/pricePoints?filter[territory]=USA&limit=200`);
  const point = usPoints.data.find((p) => p.attributes.customerPrice === LIFETIME.price);
  if (!point) throw new Error(`No $${LIFETIME.price} price point`);
  await api(
    'POST',
    '/v1/inAppPurchasePriceSchedules',
    {
      type: 'inAppPurchasePriceSchedules',
      relationships: {
        inAppPurchase: rel('inAppPurchases', iap.id),
        baseTerritory: rel('territories', 'USA'),
        manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price}' }] },
      },
    },
    [
      {
        type: 'inAppPurchasePrices',
        id: '${price}',
        attributes: { startDate: null },
        relationships: {
          inAppPurchaseV2: rel('inAppPurchases', iap.id),
          inAppPurchasePricePoint: rel('inAppPurchasePricePoints', point.id),
        },
      },
    ],
  );
  console.log(`  price $${LIFETIME.price}: set (other countries matched by Apple)`);
} else {
  console.log('  price: already set');
}

const iapShot = await api('GET', `/v2/inAppPurchases/${iap.id}/appStoreReviewScreenshot`).catch(() => ({}));
await uploadScreenshot('inAppPurchaseAppStoreReviewScreenshots', 'inAppPurchaseV2', 'inAppPurchases', iap.id, iapShot.data);

console.log('Done.');

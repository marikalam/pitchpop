// Sends a PitchPop build to App Store review through the App Store
// Connect API: makes (or reuses) the App Store version, attaches the
// build, sets "What's New" and submits it. Run by appstore.yml.
//
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (the .p8), VERSION (1.1),
// BUILD (a build number, or empty for the newest one of that version),
// WHATS_NEW, RELEASE (AFTER_APPROVAL or MANUAL).
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

const BUNDLE_ID = 'com.marikalam.pitchpop';
const API = 'https://api.appstoreconnect.apple.com';
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, VERSION, BUILD, WHATS_NEW, RELEASE, SCREENSHOTS } = process.env;

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' });
  const body = b64url({ iss: ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const key = createPrivateKey(readFileSync(ASC_KEY_PATH, 'utf8'));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${body}.${sig}`;
}

async function api(method, path, data) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify({ data }) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${text}`);
  return text ? JSON.parse(text) : {};
}

const app = (await api('GET', `/v1/apps?filter[bundleId]=${BUNDLE_ID}`)).data[0];
if (!app) throw new Error(`No app with bundle ID ${BUNDLE_ID}`);
console.log(`App: ${app.attributes.name} (${app.id})`);

// The build: the one asked for, or the newest processed one of this version.
const builds = (
  await api(
    'GET',
    `/v1/builds?filter[app]=${app.id}&filter[preReleaseVersion.version]=${VERSION}` +
      (BUILD ? `&filter[version]=${BUILD}` : '') +
      '&filter[processingState]=VALID&sort=-uploadedDate&limit=1',
  )
).data;
const build = builds[0];
if (!build) throw new Error(`No processed build ${BUILD || ''} of version ${VERSION} yet`);
console.log(`Build: ${build.attributes.version}`);
if (build.attributes.usesNonExemptEncryption == null) {
  await api('PATCH', `/v1/builds/${build.id}`, { type: 'builds', id: build.id, attributes: { usesNonExemptEncryption: false } });
}

// The App Store version (made the first time).
let version = (
  await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[versionString]=${VERSION}&filter[platform]=IOS`)
).data[0];
if (!version) {
  version = (
    await api('POST', '/v1/appStoreVersions', {
      type: 'appStoreVersions',
      attributes: { platform: 'IOS', versionString: VERSION, releaseType: RELEASE },
      relationships: { app: { data: { type: 'apps', id: app.id } } },
    })
  ).data;
  console.log(`Made App Store version ${VERSION}`);
} else {
  const state = version.attributes.appStoreState;
  console.log(`App Store version ${VERSION} is ${state}`);
  if (['PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE', 'PROCESSING_FOR_APP_STORE', 'READY_FOR_SALE'].includes(state)) {
    throw new Error(`Version ${VERSION} is already approved (${state}): make a new version for this build`);
  }
  // Already waiting for (or in) review with an older build: take it back
  // out of review so the newer build can go in instead.
  if (['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(state)) {
    const waiting = (await api('GET', `/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS&limit=20`)).data.filter(
      (sub) => ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES'].includes(sub.attributes.state),
    );
    for (const sub of waiting) {
      await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, { type: 'reviewSubmissions', id: sub.id, attributes: { canceled: true } });
      console.log(`Took the waiting submission out of review`);
    }
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 15000));
      const now = (await api('GET', `/v1/appStoreVersions/${version.id}`)).data.attributes.appStoreState;
      if (!['WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(now)) {
        console.log(`Version ${VERSION} is now ${now}`);
        break;
      }
    }
  }
  await api('PATCH', `/v1/appStoreVersions/${version.id}`, {
    type: 'appStoreVersions',
    id: version.id,
    attributes: { releaseType: RELEASE },
  });
}

await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, { type: 'builds', id: build.id });

const locs = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;
for (const loc of locs) {
  await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
    type: 'appStoreVersionLocalizations',
    id: loc.id,
    attributes: { whatsNew: WHATS_NEW },
  });
  console.log(`What's New set (${loc.attributes.locale})`);
}

// The App Store screenshots, when asked for (SCREENSHOTS=yes): the ones in
// appstore/screenshots replace what's there, for each iPhone size.
if (SCREENSHOTS === 'yes') {
  const DIRS = { APP_IPHONE_67: '6.9-inch', APP_IPHONE_65: '6.5-inch', APP_IPAD_PRO_3GEN_129: '13-inch-ipad' };
  for (const loc of locs) {
    const sets = (await api('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`)).data;
    for (const [type, dir] of Object.entries(DIRS)) {
      let set = sets.find((x) => x.attributes.screenshotDisplayType === type);
      if (!set) {
        set = (
          await api('POST', '/v1/appScreenshotSets', {
            type: 'appScreenshotSets',
            attributes: { screenshotDisplayType: type },
            relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } },
          })
        ).data;
      }
      for (const old of (await api('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots?limit=50`)).data) {
        await api('DELETE', `/v1/appScreenshots/${old.id}`);
      }
      const folder = new URL(`../../appstore/screenshots/${dir}/`, import.meta.url);
      const files = readdirSync(folder).filter((f) => f.endsWith('.png')).sort();
      for (const file of files) {
        const bytes = readFileSync(new URL(file, folder));
        const shot = (
          await api('POST', '/v1/appScreenshots', {
            type: 'appScreenshots',
            attributes: { fileName: file, fileSize: bytes.length },
            relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } },
          })
        ).data;
        for (const op of shot.attributes.uploadOperations) {
          const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
          const res = await fetch(op.url, { method: op.method, headers, body: bytes.subarray(op.offset, op.offset + op.length) });
          if (!res.ok) throw new Error(`Screenshot upload ${file} -> ${res.status}`);
        }
        await api('PATCH', `/v1/appScreenshots/${shot.id}`, {
          type: 'appScreenshots',
          id: shot.id,
          attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(bytes).digest('hex') },
        });
      }
      console.log(`Screenshots (${loc.attributes.locale}, ${dir}): ${files.length} uploaded`);
    }
  }
  // Apple checks each upload before the version can be submitted.
  await new Promise((r) => setTimeout(r, 30000));
}

// Submit: reuse a submission that hasn't been sent yet, or start one.
let submission = (
  await api('GET', `/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS&filter[state]=READY_FOR_REVIEW`)
).data[0];
if (!submission) {
  submission = (
    await api('POST', '/v1/reviewSubmissions', {
      type: 'reviewSubmissions',
      attributes: { platform: 'IOS' },
      relationships: { app: { data: { type: 'apps', id: app.id } } },
    })
  ).data;
}
try {
  await api('POST', '/v1/reviewSubmissionItems', {
    type: 'reviewSubmissionItems',
    relationships: {
      reviewSubmission: { data: { type: 'reviewSubmissions', id: submission.id } },
      appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
    },
  });
} catch (err) {
  // Already in this submission from an earlier try.
  if (!String(err).includes('409')) throw err;
}
await api('PATCH', `/v1/reviewSubmissions/${submission.id}`, {
  type: 'reviewSubmissions',
  id: submission.id,
  attributes: { submitted: true },
});
console.log(`Submitted version ${VERSION} (build ${build.attributes.version}) for review.`);

// Sends a PitchPop build to App Store review through the App Store
// Connect API: makes (or reuses) the App Store version, attaches the
// build, sets "What's New" and submits it. Run by appstore.yml.
//
// Env: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH (the .p8), VERSION (1.1),
// BUILD (a build number, or empty for the newest one of that version),
// WHATS_NEW, RELEASE (AFTER_APPROVAL or MANUAL).
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BUNDLE_ID = 'com.marikalam.pitchpop';
const API = 'https://api.appstoreconnect.apple.com';
const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, VERSION, BUILD, WHATS_NEW, RELEASE } = process.env;

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
  console.log(`App Store version ${VERSION} is ${version.attributes.appStoreState}`);
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

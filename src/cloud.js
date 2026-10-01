import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';

// Publishable (client-side) key - safe to ship in the browser. Row-level
// security on pitchpop_profiles limits each family account to its own rows.
const SUPABASE_URL = 'https://wtjhceycjiowvdpfwkjj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hcaechWMVkIchjiS_BGQjg_E8N1XHA1';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// PitchPop works without internet (airplane mode, no Wi-Fi). A signed-in
// family stays signed in: the account last used on this device is
// remembered, its players are cached (App.jsx), and changes to players
// made offline wait here (PENDING_KEY) until the account can be reached
// again (flushPendingCloud, run before every load and when the internet
// comes back). Practice history catches up the same way (historySync.js).
const ACCOUNT_KEY = 'pitchpop-account-user-v1';
const PENDING_KEY = 'pitchpop-pending-cloud-v1';

// Whether an error (or the phone) means "no internet" rather than a real
// problem with the request.
export function isOffline(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!err) return false;
  return (
    err.name === 'AuthRetryableFetchError' ||
    err.status === 0 ||
    err instanceof TypeError ||
    /failed to fetch|network|load failed|internet/i.test(err.message || '')
  );
}

const OFFLINE_MESSAGE = 'You’re offline. Connect to the internet and try again.';

function rememberUser(user) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ id: user.id, email: user.email }));
  } catch {
    /* ignore */
  }
}

function forgetUser() {
  try {
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

// The account last signed in on this device, shown right away when the
// app opens (it's checked with the server after).
export function rememberedAccount() {
  return rememberedUser();
}

function rememberedUser() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNT_KEY));
    return saved?.id ? saved : null;
  } catch {
    return null;
  }
}

// The signed-in user from the session saved on this device (no network
// needed unless it has to be refreshed).
async function sessionUser() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || rememberedUser();
  } catch {
    return rememberedUser();
  }
}

// The signed-in user, checked with the server when online. Offline, the
// account last signed in on this device.
export async function getUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (data?.user) {
      rememberUser(data.user);
      return data.user;
    }
    return error && isOffline(error) ? rememberedUser() : null;
  } catch (err) {
    return isOffline(err) ? rememberedUser() : null;
  }
}

// Where links in PitchPop's emails (confirm sign-up, reset password) lead.
// Inside the iOS app the page's own origin (capacitor://localhost) can't be
// opened from an email, so the link goes to the website marked
// ?from=app, which hands the sign-in back to the app (appLink.js).
// Supabase only follows URLs on its Redirect URLs list (Authentication ->
// URL Configuration, which needs https://marikalam.github.io/apps/pitchpop/**);
// anything else falls back to the Site URL.
const WEB_APP_URL = 'https://marikalam.github.io/apps/pitchpop/';

function emailLinkUrl() {
  return Capacitor.isNativePlatform() ? `${WEB_APP_URL}?from=app` : `${window.location.origin}${import.meta.env.BASE_URL}`;
}

// Signs in with the details from an email link handed to the app (see
// appLink.js). Returns the user, or null if the link was used up or expired.
export async function signInFromLink(accessToken, refreshToken) {
  try {
    const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    rememberUser(data.user);
    return data.user;
  } catch (err) {
    console.error('Could not sign in from the email link', err);
    return null;
  }
}

function friendlyError(error) {
  return isOffline(error) ? new Error(OFFLINE_MESSAGE) : error;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password }).catch((err) => ({ error: err }));
  if (error) throw friendlyError(error);
  rememberUser(data.user);
  return data.user;
}

export async function signUp(email, password) {
  // Without emailRedirectTo, the confirmation link goes to the project's
  // Site URL setting instead of back to PitchPop.
  const { data, error } = await supabase.auth
    .signUp({
      email,
      password,
      options: { emailRedirectTo: emailLinkUrl() },
    })
    .catch((err) => ({ error: err }));
  if (error) throw friendlyError(error);
  if (data.session) rememberUser(data.user);
  // With email confirmation on, Supabase returns a user but no session -
  // both for a new email (until it's confirmed) and for one that already
  // has an account (so sign-up can't be used to find out which emails are
  // registered). Only a session means someone is actually signed in.
  return data.session ? data.user : null;
}

// Signs out on this device at once, even offline: the saved sign-in is
// cleared directly (the Supabase client can be busy retrying the server
// for a while without internet). Telling the server finishes in the
// background when it can.
const SESSION_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

export async function signOut() {
  forgetUser();
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  supabase.auth.signOut().catch(() => supabase.auth.signOut({ scope: 'local' }).catch(() => {}));
}

// Sends an email with a link back to this app; Supabase appends a recovery
// token to the URL, which onAuthEvent() below picks up as a
// PASSWORD_RECOVERY event so the app can show the "set a new password" form.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth
    .resetPasswordForEmail(email, { redirectTo: emailLinkUrl() })
    .catch((err) => ({ error: err }));
  if (error) throw friendlyError(error);
}

// Only works while the special recovery session from the emailed link (or
// an already-signed-in session) is active.
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword }).catch((err) => ({ error: err }));
  if (error) throw friendlyError(error);
}

// Permanently deletes the signed-in account and its saved players (the
// database side is supabase/delete_my_account.sql). Players saved on this
// device stay, so the family can keep playing signed out.
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account').catch((err) => ({ error: err }));
  if (error) throw friendlyError(error);
  forgetUser();
  // The account no longer exists, so only clear this device's session.
  await supabase.auth.signOut({ scope: 'local' });
}

export function onAuthEvent(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}

// Players changed while offline, waiting to be sent: { upserts: {id:
// player}, deletes: [id] }.
function loadPending() {
  try {
    const saved = JSON.parse(localStorage.getItem(PENDING_KEY));
    return { upserts: saved?.upserts || {}, deletes: saved?.deletes || [] };
  } catch {
    return { upserts: {}, deletes: [] };
  }
}

function savePending(pending) {
  try {
    if (!Object.keys(pending.upserts).length && !pending.deletes.length) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

// Each returns false only when it couldn't reach the account (to try
// again later); other errors are logged and not retried.
async function upsertProfile(user, profile) {
  try {
    const { error } = await supabase
      .from('pitchpop_profiles')
      .upsert(
        { owner_id: user.id, profile_key: profile.id, name: profile.name, colors: profile.colors },
        { onConflict: 'owner_id,profile_key' },
      );
    if (error) {
      if (isOffline(error)) return false;
      console.error('Could not save PitchPop profile', error);
    }
    return true;
  } catch (err) {
    if (isOffline(err)) return false;
    console.error('Could not reach PitchPop storage', err);
    return true;
  }
}

async function removeProfile(user, profileId) {
  try {
    const { error } = await supabase
      .from('pitchpop_profiles')
      .delete()
      .eq('owner_id', user.id)
      .eq('profile_key', profileId);
    if (error) {
      if (isOffline(error)) return false;
      console.error('Could not delete PitchPop profile', error);
    }
    return true;
  } catch (err) {
    if (isOffline(err)) return false;
    console.error('Could not reach PitchPop storage', err);
    return true;
  }
}

// Sends the players changed while offline. Returns true when nothing is
// left waiting.
export async function flushPendingCloud() {
  const pending = loadPending();
  if (!Object.keys(pending.upserts).length && !pending.deletes.length) return true;
  const user = await sessionUser();
  if (!user) return false;
  for (const id of Object.keys(pending.upserts)) {
    if (await upsertProfile(user, pending.upserts[id])) delete pending.upserts[id];
  }
  const stillDeleting = [];
  for (const id of pending.deletes) {
    if (!(await removeProfile(user, id))) stillDeleting.push(id);
  }
  pending.deletes = stillDeleting;
  savePending(pending);
  return !Object.keys(pending.upserts).length && !pending.deletes.length;
}

// Returns null when signed out or unreachable, so callers keep the
// players cached on this device.
export async function loadCloudProfiles() {
  if (!(await sessionUser())) return null;
  // Changes made offline go up first, so they aren't overwritten.
  if (!(await flushPendingCloud())) return null;
  try {
    const { data, error } = await supabase
      .from('pitchpop_profiles')
      .select('profile_key, name, colors')
      .order('created_at');
    if (error) {
      if (!isOffline(error)) console.error('Could not load PitchPop profiles', error);
      return null;
    }
    return data
      .filter((row) => row.profile_key && row.name && Array.isArray(row.colors) && row.colors.length)
      .map((row) => ({ id: row.profile_key, name: row.name, colors: row.colors }));
  } catch (err) {
    if (!isOffline(err)) console.error('Could not reach PitchPop storage', err);
    return null;
  }
}

// Saved now if the account can be reached, otherwise when it can again.
export async function saveCloudProfile(profile) {
  const user = await sessionUser();
  if (!user) return;
  const done = await upsertProfile(user, profile);
  const pending = loadPending();
  if (done) delete pending.upserts[profile.id];
  else {
    pending.upserts[profile.id] = profile;
    pending.deletes = pending.deletes.filter((id) => id !== profile.id);
  }
  savePending(pending);
}

export async function deleteCloudProfile(profileId) {
  const user = await sessionUser();
  if (!user) return;
  const done = await removeProfile(user, profileId);
  const pending = loadPending();
  delete pending.upserts[profileId];
  if (!done && !pending.deletes.includes(profileId)) pending.deletes.push(profileId);
  savePending(pending);
}

// Sends one player's practice history and game streak days to the family
// account and gets back everything saved there, from every phone (the
// database side is supabase/player_history_sync.sql). Returns null when
// signed out or unreachable, or before that SQL has been run.
export async function mergeCloudHistory(profileId, practiceLog, streakDays) {
  try {
    const { data, error } = await supabase.rpc('merge_player_history', {
      p_profile_key: profileId,
      p_practice_log: practiceLog,
      p_streak_days: streakDays,
    });
    if (error) {
      console.error('Could not sync PitchPop history', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Could not reach PitchPop storage', err);
    return null;
  }
}

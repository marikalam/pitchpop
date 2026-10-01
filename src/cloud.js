import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';

// Publishable (client-side) key - safe to ship in the browser. Row-level
// security on pitchpop_profiles limits each family account to its own rows.
const SUPABASE_URL = 'https://wtjhceycjiowvdpfwkjj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hcaechWMVkIchjiS_BGQjg_E8N1XHA1';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function getUser() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// Where links in PitchPop's emails (confirm sign-up, reset password) lead.
// Inside the iOS app the page's own origin (capacitor://localhost) can't be
// opened from an email, so the link goes to the website instead. Supabase
// only follows URLs on its Redirect URLs list (Authentication -> URL
// Configuration); anything else falls back to the Site URL.
const WEB_APP_URL = 'https://marikalam.github.io/apps/pitchpop/';

function emailLinkUrl() {
  return Capacitor.isNativePlatform() ? WEB_APP_URL : `${window.location.origin}${import.meta.env.BASE_URL}`;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password) {
  // Without emailRedirectTo, the confirmation link goes to the project's
  // Site URL setting instead of back to PitchPop.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: emailLinkUrl() },
  });
  if (error) throw error;
  // With email confirmation on, Supabase returns a user but no session -
  // both for a new email (until it's confirmed) and for one that already
  // has an account (so sign-up can't be used to find out which emails are
  // registered). Only a session means someone is actually signed in.
  return data.session ? data.user : null;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Sends an email with a link back to this app; Supabase appends a recovery
// token to the URL, which onAuthEvent() below picks up as a
// PASSWORD_RECOVERY event so the app can show the "set a new password" form.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: emailLinkUrl() });
  if (error) throw error;
}

// Only works while the special recovery session from the emailed link (or
// an already-signed-in session) is active.
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// Permanently deletes the signed-in account and its saved players (the
// database side is supabase/delete_my_account.sql). Players saved on this
// device stay, so the family can keep playing signed out.
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  // The account no longer exists, so only clear this device's session.
  await supabase.auth.signOut({ scope: 'local' });
}

export function onAuthEvent(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}

// Returns null when signed out or unreachable, so callers keep local profiles.
export async function loadCloudProfiles() {
  if (!(await getUser())) return null;
  try {
    const { data, error } = await supabase
      .from('pitchpop_profiles')
      .select('profile_key, name, colors')
      .order('created_at');
    if (error) {
      console.error('Could not load PitchPop profiles', error);
      return null;
    }
    return data
      .filter((row) => row.profile_key && row.name && Array.isArray(row.colors) && row.colors.length)
      .map((row) => ({ id: row.profile_key, name: row.name, colors: row.colors }));
  } catch (err) {
    console.error('Could not reach PitchPop storage', err);
    return null;
  }
}

export async function saveCloudProfile(profile) {
  const user = await getUser();
  if (!user) return;
  try {
    const { error } = await supabase
      .from('pitchpop_profiles')
      .upsert(
        { owner_id: user.id, profile_key: profile.id, name: profile.name, colors: profile.colors },
        { onConflict: 'owner_id,profile_key' },
      );
    if (error) console.error('Could not save PitchPop profile', error);
  } catch (err) {
    console.error('Could not reach PitchPop storage', err);
  }
}

export async function deleteCloudProfile(profileId) {
  const user = await getUser();
  if (!user) return;
  try {
    const { error } = await supabase
      .from('pitchpop_profiles')
      .delete()
      .eq('owner_id', user.id)
      .eq('profile_key', profileId);
    if (error) console.error('Could not delete PitchPop profile', error);
  } catch (err) {
    console.error('Could not reach PitchPop storage', err);
  }
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

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

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
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

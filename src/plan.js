import { Capacitor } from '@capacitor/core';

// PitchPop Family: the paid plan (a monthly or yearly subscription with a
// free week, bought in the iPhone app through Apple and RevenueCat). It
// covers every player in the family account.
//
// Free for everyone: Pitch Practice with the first FREE_COLORS colors,
// Explore, Piano, Tiny Tots, Practice Mode, Music Theory and the sticker
// book. The plan adds the colors after those, NoteSpeller, Scales, Hanon,
// the Progress page and more than one player.
//
// Everyone who had PitchPop before it went paid keeps everything free:
// accounts made before PAID_SINCE, phones that were already using it then,
// and Apple IDs that first downloaded a build before FIRST_PAID_BUILD.
//
// Until REVENUECAT_IOS_KEY and PAID_SINCE are set, there's no plan:
// everything is open, as before. (The website stays open too; the plan is
// only sold in the app.)
export const REVENUECAT_IOS_KEY = '';
export const PAID_SINCE = null; // 'YYYY-MM-DD'
export const FIRST_PAID_BUILD = null; // e.g. 110
export const ENTITLEMENT = 'family';
export const FREE_COLORS = 3;
export const PRICES = { monthly: '$4.99', yearly: '$29.99' };
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://marikalam.github.io/apps/pitchpop/privacy.html';

const GRANDFATHER_KEY = 'pitchpop-grandfathered-v1';
const PLAN_KEY = 'pitchpop-plan-v1';

export const plansOn = () => Capacitor.isNativePlatform() && !!REVENUECAT_IOS_KEY && !!PAID_SINCE;

const today = () => new Date().toISOString().slice(0, 10);

// This phone was using PitchPop before it went paid: decided once, the
// first time this version runs.
function phoneGrandfathered() {
  try {
    const saved = localStorage.getItem(GRANDFATHER_KEY);
    if (saved !== null) return saved === '1';
    const before = !PAID_SINCE || today() < PAID_SINCE;
    const used = ['pitchpop-welcome-seen-v1', 'pitchpop-profiles-v1', 'pitchpop-practice-log-v1', 'pitchpop-streak-days-v1'].some(
      (k) => localStorage.getItem(k) !== null,
    );
    const yes = before || used;
    localStorage.setItem(GRANDFATHER_KEY, yes ? '1' : '0');
    return yes;
  } catch {
    return false;
  }
}

// Run at startup, so a new phone is judged before it's used.
export function notePhone() {
  phoneGrandfathered();
}

function accountGrandfathered(user) {
  return !!(user?.created_at && PAID_SINCE && user.created_at.slice(0, 10) < PAID_SINCE);
}

// The last thing RevenueCat said (kept for offline): { active, original }.
function savedPlan() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY)) || {};
  } catch {
    return {};
  }
}

export function hasPlan(user) {
  if (!plansOn()) return true;
  if (phoneGrandfathered() || accountGrandfathered(user)) return true;
  const plan = savedPlan();
  if (plan.active) return true;
  if (FIRST_PAID_BUILD && plan.original && Number(plan.original) < FIRST_PAID_BUILD) return true;
  return false;
}

// The RevenueCat plugin, loaded when first needed. (Hands back the module:
// awaiting the plugin object itself would trip Capacitor's proxy.)
const sdk = () => import('@revenuecat/purchases-capacitor');

function remember(customerInfo) {
  const active = !!customerInfo?.entitlements?.active?.[ENTITLEMENT];
  const plan = { active, original: customerInfo?.originalApplicationVersion || null, checkedAt: Date.now() };
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('pitchpop-plan-changed'));
  return active;
}

let configured = false;

// Connects to RevenueCat as the family account (so the plan follows the
// account to every phone), and checks the plan.
export async function startPlans(user) {
  if (!plansOn()) return;
  try {
    const { Purchases } = await sdk();
    if (!configured) {
      await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: user?.id || null });
      configured = true;
      Purchases.addCustomerInfoUpdateListener((info) => remember(info));
    } else if (user?.id) {
      await Purchases.logIn({ appUserID: user.id });
    }
    const { customerInfo } = await Purchases.getCustomerInfo();
    remember(customerInfo);
  } catch (err) {
    console.error('Could not check PitchPop Family', err);
  }
}

// The plan's choices from the App Store, with their prices there:
// [{ id: 'yearly' | 'monthly', price, pkg }].
export async function planOptions() {
  const { Purchases } = await sdk();
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings?.current?.availablePackages || [];
  return pkgs
    .map((pkg) => ({
      id: pkg.packageType === 'ANNUAL' ? 'yearly' : pkg.packageType === 'MONTHLY' ? 'monthly' : pkg.identifier,
      price: pkg.product?.priceString,
      pkg,
    }))
    .filter((o) => o.id === 'yearly' || o.id === 'monthly')
    .sort((a, b) => (a.id === 'yearly' ? 0 : 1) - (b.id === 'yearly' ? 0 : 1));
}

// Returns true when the plan is on; false when they changed their mind.
export async function buyPlan(option) {
  const { Purchases } = await sdk();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: option.pkg });
    return remember(customerInfo);
  } catch (err) {
    if (err?.userCancelled || err?.code === '1' || err?.code === 1) return false;
    throw err;
  }
}

export async function restorePlan() {
  const { Purchases } = await sdk();
  const { customerInfo } = await Purchases.restorePurchases();
  return remember(customerInfo);
}

export async function manageSubscription() {
  const { Purchases } = await sdk();
  const { customerInfo } = await Purchases.getCustomerInfo();
  const url = customerInfo?.managementURL || 'https://apps.apple.com/account/subscriptions';
  window.open(url, '_blank');
}

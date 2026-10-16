import { Capacitor } from '@capacitor/core';

// PitchPop Family: the paid plan, sold in the iPhone app through Apple and
// RevenueCat - a monthly or yearly subscription (with a free week) or a
// one-time lifetime unlock. Any of them turns on the RevenueCat
// entitlement ENTITLEMENT. It's tied to the family account (the RevenueCat
// app user id is the account's id), so it covers every child on every
// phone signed in to it.
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
// RevenueCat keys (public SDK keys, safe in the app):
//  - REVENUECAT_IOS_KEY (appl_...): the real App Store. Used by TestFlight
//    and App Store builds. Until it and PAID_SINCE are set, there's no plan
//    and everything stays open.
//  - REVENUECAT_TEST_KEY (test_...): RevenueCat's Test Store, for trying the
//    paywall without the App Store. RevenueCat makes release builds
//    (TestFlight, App Store) crash on purpose with this key, so it's only
//    used by a build made with VITE_RC_TEST_STORE=1 and run from Xcode in
//    Debug. That build also skips the "already had PitchPop" rule, so the
//    paywall shows.
export const REVENUECAT_IOS_KEY = 'appl_KHWfQWLfxPNyoCQgFffKQrZXCZK';
export const REVENUECAT_TEST_KEY = 'test_pULWpDLJNNYYTQuLJYChWdXNWnt';
export const PAID_SINCE = null; // 'YYYY-MM-DD'
export const FIRST_PAID_BUILD = null; // e.g. 110
export const ENTITLEMENT = 'pitchpop_pro';
export const FREE_COLORS = 3;
export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://marikalam.github.io/apps/pitchpop/privacy.html';

const TEST_STORE = import.meta.env.VITE_RC_TEST_STORE === '1';
const apiKey = () => (TEST_STORE ? REVENUECAT_TEST_KEY : REVENUECAT_IOS_KEY);

const GRANDFATHER_KEY = 'pitchpop-grandfathered-v1';
const PLAN_KEY = 'pitchpop-plan-v1';

export const plansOn = () => Capacitor.isNativePlatform() && !!apiKey() && (TEST_STORE || !!PAID_SINCE);

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

// The last thing RevenueCat said (kept so it works offline):
// { active, lifetime, expires, willRenew, original, checkedAt }.
export function savedPlan() {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY)) || {};
  } catch {
    return {};
  }
}

// Has PitchPop Family because they had PitchPop before it was paid.
export function freeForever(user) {
  if (!plansOn() || TEST_STORE) return false;
  return phoneGrandfathered() || accountGrandfathered(user);
}

export function hasPlan(user) {
  if (!plansOn()) return true;
  if (freeForever(user)) return true;
  const plan = savedPlan();
  if (plan.active) return true;
  if (!TEST_STORE && FIRST_PAID_BUILD && plan.original && Number(plan.original) < FIRST_PAID_BUILD) return true;
  return false;
}

// The RevenueCat plugins, loaded when first needed. (Hands back the
// modules: awaiting a Capacitor plugin object itself trips its proxy.)
const sdk = () => import('@revenuecat/purchases-capacitor');
const ui = () => import('@revenuecat/purchases-capacitor-ui');

function remember(customerInfo) {
  const ent = customerInfo?.entitlements?.active?.[ENTITLEMENT];
  const plan = {
    active: !!ent,
    lifetime: !!ent && !ent.expirationDate,
    expires: ent?.expirationDate || null,
    willRenew: !!ent?.willRenew,
    original: customerInfo?.originalApplicationVersion || null,
    checkedAt: Date.now(),
  };
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('pitchpop-plan-changed'));
  return plan.active;
}

let configured = false;
let currentUserId = null;

// Connects to RevenueCat as the family account (so the plan follows the
// account to every phone; signed out, RevenueCat uses an anonymous id),
// and keeps the plan up to date as RevenueCat reports changes (a renewal,
// a cancellation, a purchase on another phone).
export async function startPlans(user) {
  if (!plansOn()) return;
  try {
    const { Purchases } = await sdk();
    const userId = user?.id || null;
    if (!configured) {
      if (TEST_STORE) await Purchases.setLogLevel({ level: 'DEBUG' });
      await Purchases.configure({ apiKey: apiKey(), appUserID: userId });
      configured = true;
      currentUserId = userId;
      await Purchases.addCustomerInfoUpdateListener((info) => remember(info));
    } else if (userId && userId !== currentUserId) {
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });
      currentUserId = userId;
      remember(customerInfo);
      return;
    } else if (!userId && currentUserId) {
      const { customerInfo } = await Purchases.logOut();
      currentUserId = null;
      remember(customerInfo);
      return;
    }
    const { customerInfo } = await Purchases.getCustomerInfo();
    remember(customerInfo);
  } catch (err) {
    console.error('Could not check PitchPop Family', err);
  }
}

// What went wrong, in words for a parent. null when there's nothing to
// say (they cancelled).
export function planErrorMessage(err) {
  const code = String(err?.code ?? '');
  if (err?.userCancelled || code === '1') return null;
  if (code === '20') return 'Waiting for a grown-up to approve the purchase (Ask to Buy). It turns on once approved.';
  if (code === '10' || code === '35') return "Couldn't reach the App Store. Check the internet and try again.";
  if (code === '2') return 'The App Store had a problem. Nothing was charged; try again in a moment.';
  if (code === '3') return 'Purchases are turned off on this iPhone (Screen Time settings).';
  if (code === '6') return 'This Apple ID already owns PitchPop Family. Tap Restore purchases.';
  return 'That didn’t go through. Nothing was charged; try again.';
}

// RevenueCat's paywall (designed in the RevenueCat dashboard, for the
// current offering: Lifetime, Yearly and Monthly). Returns 'PURCHASED',
// 'RESTORED', 'CANCELLED', 'NOT_PRESENTED' or 'ERROR'.
export async function showPaywall() {
  const { RevenueCatUI } = await ui();
  const { result } = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: ENTITLEMENT,
    displayCloseButton: true,
  });
  if (result === 'PURCHASED' || result === 'RESTORED') await refreshPlan();
  return result;
}

// RevenueCat's Customer Center: the plan, changing it, cancelling,
// refunds and restore, for a family that has it. Falls back to Apple's
// subscriptions page.
export async function showCustomerCenter() {
  try {
    const { RevenueCatUI } = await ui();
    await RevenueCatUI.presentCustomerCenter();
    await refreshPlan();
  } catch {
    window.open('https://apps.apple.com/account/subscriptions', '_blank');
  }
}

export async function refreshPlan() {
  const { Purchases } = await sdk();
  const { customerInfo } = await Purchases.getCustomerInfo();
  return remember(customerInfo);
}

export async function restorePlan() {
  const { Purchases } = await sdk();
  const { customerInfo } = await Purchases.restorePurchases();
  return remember(customerInfo);
}

// The offering's packages, for our own buttons if RevenueCat's paywall
// can't be shown: [{ id: 'lifetime' | 'yearly' | 'monthly', price, pkg }].
export async function planOptions() {
  const { Purchases } = await sdk();
  const offerings = await Purchases.getOfferings();
  const ids = { LIFETIME: 'lifetime', ANNUAL: 'yearly', MONTHLY: 'monthly' };
  const order = ['yearly', 'monthly', 'lifetime'];
  return (offerings?.current?.availablePackages || [])
    .map((pkg) => ({ id: ids[pkg.packageType] || pkg.product?.identifier, price: pkg.product?.priceString, pkg }))
    .filter((o) => order.includes(o.id))
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

// Returns true when the plan is on; false when they changed their mind.
// Other problems are thrown (see planErrorMessage).
export async function buyPlan(option) {
  const { Purchases } = await sdk();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: option.pkg });
    return remember(customerInfo);
  } catch (err) {
    if (planErrorMessage(err) === null) return false;
    throw err;
  }
}

import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

// The iOS app allows landscape (Info.plist) only so the Piano screen can
// turn sideways; every other screen is laid out for portrait, so the app
// keeps itself locked to portrait and unlocks just while the piano is open.
// The website can't lock rotation on phones, so these do nothing there.
const isNative = Capacitor.isNativePlatform();

export function keepPortrait() {
  if (isNative) ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
}

export function allowRotation() {
  if (isNative) ScreenOrientation.unlock().catch(() => {});
}

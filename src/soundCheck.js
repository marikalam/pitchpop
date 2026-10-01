import { Capacitor, registerPlugin } from '@capacitor/core';
import { playCorrectChime } from './piano.js';
import { newSound } from './soundBus.js';
import { unlockAudio } from './speech.js';

// Helps a family know whether they'll hear PitchPop:
// - In the iPhone app, the phone's volume (0 to 1) is known (native
//   DeviceVolumePlugin.swift), so the header can say "Turn the volume up".
//   The silent switch doesn't matter there: the app plays even on silent.
// - Everywhere, "Sound check" plays a short chime and shows a tip
//   (SoundNotices.jsx).
// - On the iPhone website, Safari is muted by the silent switch, so the
//   first sound shows a one-time tip about it.
export const canReadVolume = Capacitor.getPlatform() === 'ios';
export const isIPhoneWebsite =
  !Capacitor.isNativePlatform() &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

// At or below this the phone is silent or nearly (one press of the volume
// button is 1/16).
export const LOW_VOLUME = 0.07;

const DeviceVolume = canReadVolume ? registerPlugin('DeviceVolume') : null;

// Calls onVolume(volume) now and whenever it changes (also after the app
// comes back to the front). Returns a function that stops watching.
export function watchVolume(onVolume) {
  if (!DeviceVolume) return () => {};
  const read = () =>
    DeviceVolume.getVolume()
      .then(({ volume }) => onVolume(volume))
      .catch(() => {});
  read();
  const listener = DeviceVolume.addListener('change', ({ volume }) => onVolume(volume));
  const onVisible = () => {
    if (document.visibilityState === 'visible') read();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    listener.then((l) => l.remove()).catch(() => {});
  };
}

export function playSoundCheck() {
  // First, so the sound check's own note (which covers the silent switch
  // too) takes the place of the one-time tip.
  window.dispatchEvent(new Event('pitchpop-sound-check'));
  unlockAudio();
  newSound();
  playCorrectChime();
}

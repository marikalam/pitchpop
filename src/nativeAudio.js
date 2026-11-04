import { Capacitor, registerPlugin } from '@capacitor/core';

// The iPhone app's own sound helper (ios/App/App/DeviceVolumePlugin.swift):
// the volume, where the sound goes, and the audio session. null on the
// website.
export const DeviceVolume = Capacitor.getPlatform() === 'ios' ? registerPlugin('DeviceVolume') : null;

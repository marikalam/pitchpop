import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Email links (confirm your account, reset your password) go back to the
// app they came from. Emails sent from the iPhone app link to the website
// with ?from=app; the website then hands the sign-in on to the app through
// its pitchpop:// link (registered in ios/App/App/Info.plist), and the app
// signs in with it. A link opened on another device (a computer, say)
// simply signs in on the website, as before.

const APP_SCHEME = 'pitchpop://auth';

function parseHash(hash) {
  return Object.fromEntries(new URLSearchParams((hash || '').replace(/^#/, '')));
}

// Website side: when this page was opened from an email the iPhone app
// sent, the link that reopens the app (with the sign-in details), and
// whether it was a password reset. null otherwise.
export function appHandoffFromEmail() {
  if (Capacitor.isNativePlatform()) return null;
  const url = new URL(window.location.href);
  if (url.searchParams.get('from') !== 'app') return null;
  url.searchParams.delete('from');
  window.history.replaceState(null, '', url.pathname + url.search);
  const hash = window.__pitchpopLaunchHash || '';
  const params = parseHash(hash);
  if (!params.access_token || !params.refresh_token) return null;
  return { link: `${APP_SCHEME}${hash}`, recovery: params.type === 'recovery' };
}

// App side: calls onLink({ accessToken, refreshToken, recovery }) for each
// pitchpop:// link the app is opened with (including the one that
// launched it). Returns a function that stops listening.
export function listenForAppLinks(onLink) {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handle = (url) => {
    if (!url || !url.startsWith('pitchpop:')) return;
    const params = parseHash(url.slice(url.indexOf('#')));
    if (!params.access_token || !params.refresh_token) return;
    onLink({
      accessToken: params.access_token,
      refreshToken: params.refresh_token,
      recovery: params.type === 'recovery',
    });
  };
  CapacitorApp.getLaunchUrl()
    .then((launch) => handle(launch?.url))
    .catch(() => {});
  const listener = CapacitorApp.addListener('appUrlOpen', (event) => handle(event.url));
  return () => {
    listener.then((l) => l.remove()).catch(() => {});
  };
}

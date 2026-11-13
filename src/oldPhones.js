// Older iPhones that can't update past iOS 12 (the iPhone 6 and 5s) open
// PitchPop's website in an older Safari. The page is built for that Safari
// (vite.config.js: build.target), and these fill in the few newer things
// PitchPop uses that it doesn't have. On newer phones none of this runs.

if (typeof Promise.allSettled !== 'function') {
  Promise.allSettled = (items) =>
    Promise.all(
      Array.from(items, (p) =>
        Promise.resolve(p).then(
          (value) => ({ status: 'fulfilled', value }),
          (reason) => ({ status: 'rejected', reason }),
        ),
      ),
    );
}

if (!String.prototype.replaceAll) {
  // eslint-disable-next-line no-extend-native
  String.prototype.replaceAll = function replaceAll(find, to) {
    return typeof find === 'string' ? this.split(find).join(to) : this.replace(find, to);
  };
}

if (!Array.prototype.at) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.at = function at(i) {
    const n = Math.trunc(i) || 0;
    return this[n < 0 ? this.length + n : n];
  };
}

// No ResizeObserver: check again when the window changes size.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    constructor(callback) {
      this.run = () => callback([], this);
    }
    observe() {
      if (this.on) return;
      this.on = true;
      window.addEventListener('resize', this.run);
      setTimeout(this.run, 0);
    }
    unobserve() {}
    disconnect() {
      this.on = false;
      window.removeEventListener('resize', this.run);
    }
  };
}

// iOS 12's Web Audio only has the older webkit names, where decoding a
// sound and rendering one ahead of time report back by callback instead of
// returning a promise. PitchPop's chords and piano notes wait on promises.
if (typeof window !== 'undefined' && !window.AudioContext && window.webkitAudioContext) {
  const Ctx = window.webkitAudioContext;
  const decode = Ctx.prototype.decodeAudioData;
  Ctx.prototype.decodeAudioData = function decodeAudioData(data, ok, fail) {
    return new Promise((resolve, reject) => {
      decode.call(
        this,
        data,
        (buffer) => {
          if (ok) ok(buffer);
          resolve(buffer);
        },
        (error) => {
          if (fail) fail(error);
          reject(error);
        },
      );
    });
  };
  const Offline = window.webkitOfflineAudioContext;
  if (Offline) {
    Offline.prototype.decodeAudioData = Ctx.prototype.decodeAudioData;
    const render = Offline.prototype.startRendering;
    Offline.prototype.startRendering = function startRendering() {
      return new Promise((resolve) => {
        this.oncomplete = (e) => resolve(e.renderedBuffer);
        const result = render.call(this);
        if (result && typeof result.then === 'function') result.then(resolve);
      });
    };
  }
}

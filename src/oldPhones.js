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

// iOS 12's Safari has no "pointer" events (pointerdown/pointerup), which
// the piano keys and the sound's start-up listen for, so nothing played.
// There, touches (and mouse clicks) are passed on as pointer events, from
// inside the touch itself so they still count as a tap.
if (typeof window !== 'undefined' && !window.PointerEvent) {
  let lastTouch = 0;
  const relay = (type) => (e) => {
    const touch = e.type.startsWith('touch');
    if (touch) lastTouch = Date.now();
    // The phone also sends a mouse event after a touch: only one counts.
    else if (Date.now() - lastTouch < 800) return;
    const point = touch ? e.changedTouches && e.changedTouches[0] : e;
    const ev = document.createEvent('Event');
    ev.initEvent(type, true, true);
    ev.clientX = point ? point.clientX : 0;
    ev.clientY = point ? point.clientY : 0;
    ev.pointerType = touch ? 'touch' : 'mouse';
    ev.button = 0;
    ev.isPrimary = true;
    // As with real pointer events, cancelling one doesn't cancel the tap.
    e.target.dispatchEvent(ev);
  };
  document.addEventListener('touchstart', relay('pointerdown'), true);
  document.addEventListener('touchend', relay('pointerup'), true);
  document.addEventListener('touchcancel', relay('pointercancel'), true);
  document.addEventListener('mousedown', relay('pointerdown'), true);
  document.addEventListener('mouseup', relay('pointerup'), true);
}

// iOS 12 only lets web sound start inside the end of a tap (touchend), and
// only once a sound has actually played there. So each sound context is
// kept, and the end of every tap wakes it with a moment of silence.
if (typeof window !== 'undefined' && !window.AudioContext && window.webkitAudioContext) {
  const Original = window.webkitAudioContext;
  const made = [];
  const Wrapped = function WebkitAudioContext(...args) {
    const ctx = new Original(...args);
    made.push(ctx);
    return ctx;
  };
  Wrapped.prototype = Original.prototype;
  window.webkitAudioContext = Wrapped;
  const wake = () => {
    made.forEach((ctx) => {
      if (ctx.state === 'closed') return;
      try {
        if (ctx.state !== 'running' && ctx.resume) ctx.resume();
        const silence = ctx.createBufferSource();
        silence.buffer = ctx.createBuffer(1, 1, 22050);
        silence.connect(ctx.destination);
        silence.start(0);
      } catch {
        /* ignore */
      }
    });
  };
  document.addEventListener('touchend', wake, true);
}

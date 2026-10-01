import { useEffect, useRef } from 'react';
import { newSound } from './soundBus.js';

// Makes "back" work like in other apps: swiping from the left edge in the
// iPhone app, and the browser's back button or swipe on the website, go to
// the screen you were on before. PitchPop switches screens itself (one
// `view` state), so this mirrors those switches into the browser history:
// each new screen adds an entry; going back to the previous screen (the
// in-app ← Back too) steps back instead of adding one, so the history
// stays a simple trail. The steps of a game round (listen, answer,
// feedback) are one screen, so back leaves the round rather than undoing
// answers; the round itself stays as it was.
function screenOf(view) {
  return view.startsWith('play-') ? 'play' : view;
}

export function useScreenHistory(view, setView) {
  const state = useRef(null);
  const setViewRef = useRef(setView);
  setViewRef.current = setView;

  useEffect(() => {
    const s = { stack: [{ screen: screenOf(view), view }], idx: 0, fromPop: false, skipPops: 0 };
    state.current = s;
    window.history.replaceState({ pitchpop: true, idx: 0 }, '');
    const onPop = (event) => {
      if (s.skipPops > 0) {
        s.skipPops -= 1;
        return;
      }
      const entry = event.state?.pitchpop ? s.stack[event.state.idx] : null;
      s.fromPop = true;
      // An entry from before a reload: start over at home.
      s.idx = entry ? event.state.idx : 0;
      newSound();
      setViewRef.current(entry ? entry.view : 'home');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // Set up once; later views are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = state.current;
    if (!s) return;
    const screen = screenOf(view);
    if (s.fromPop) {
      s.fromPop = false;
      s.stack[s.idx] = { screen, view };
      return;
    }
    if (s.stack[s.idx]?.screen === screen) {
      s.stack[s.idx].view = view;
      return;
    }
    if (s.idx > 0 && s.stack[s.idx - 1].screen === screen) {
      s.idx -= 1;
      s.stack[s.idx].view = view;
      s.skipPops += 1;
      window.history.back();
      return;
    }
    s.stack = s.stack.slice(0, s.idx + 1);
    s.stack.push({ screen, view });
    s.idx += 1;
    window.history.pushState({ pitchpop: true, idx: s.idx }, '');
  }, [view]);
}

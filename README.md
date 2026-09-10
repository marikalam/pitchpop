# PitchPop

We have a game we play: I play a chord on the piano, and my kids have to grab the matching color flag and shout it out. C-E-G is red, A-C-F is black, B-D-G is blue, and so on through nine chords.

Nine buttons, one per color, each one plays the right chord. Tap red, it plays C-E-G. That's the whole app.

Live at **[marikalam.github.io/pitchpop](https://marikalam.github.io/pitchpop/)**.

## What it looks like

<img src="screenshots/01-idle.png" width="360" alt="PitchPop at rest, waiting for a tap"> <img src="screenshots/02-red.png" width="360" alt="After tapping red — a quiet ring confirms the tap, nothing reveals the color">

Tapping a pad plays the chord and puts a quick ring around that one button so you know it registered. A little rainbow also arcs up and glows on the color you just played, just for fun.

## Practice mode

The pill in the header (🎯 Practice / ← Explore) switches between the two ways to use the app — there's no settings menu hiding it. **Explore** is the grid above: free play, tap anything. **Practice** replaces the grid with a big real-spectrum rainbow floating on the page (red/orange/yellow/green/blue/indigo/violet — no black or brown bands, it's meant to look like an actual rainbow) — pick Maddie (all nine colors) or Marcus (the six he's working on: black, blue, red, yellow, green, orange). Tap it to hear the next chord from a pre-shuffled 20-round session for that kid (a fair shuffle-and-repeat, so nobody gets a lucky streak of the same colors); a "Hear it again" link appears so the kids can get a second listen before anyone commits to an answer. Nothing reveals automatically — tap the rainbow again when you're ready, and it bursts into a shower of sparks in the chord's actual color before settling into a colored square with the name and notes. Tapping again plays the next round. After round 20 it says so, and the next tap starts a fresh set.

## Running it

```
npm install
npm run dev
```

Add it to your phone's home screen from the browser (Share → Add to Home Screen on iPhone) and it behaves like a real app — full screen, one tap, no browser chrome.

## Why the notes are in that order

`src/piano.js` always treats the first letter in a color's note list as the one that goes on the bottom, and stacks the rest upward from there. Black's A is the lowest note in the whole app; red's C sits on middle C. If you ever add a color, that's the rule to follow.

The "piano" sound isn't a sample — it's synthesized (a handful of harmonics per note plus a bit of hammer noise and reverb) to get closer to a real piano without shipping actual audio files.

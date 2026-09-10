# PitchPop

We have a game we play: I play a chord on the piano, and my kids have to grab the matching color flag and shout it out. C-E-G is red, A-C-F is black, B-D-G is blue, and so on through nine chords.

Nine buttons, one per color, each one plays the right chord. Tap red, it plays C-E-G. That's the whole app.

Live at **[marikalam.github.io/pitchpop](https://marikalam.github.io/pitchpop/)**.

## What it looks like

<img src="screenshots/01-idle.png" width="360" alt="PitchPop at rest, waiting for a tap"> <img src="screenshots/02-red.png" width="360" alt="After tapping red — a quiet ring confirms the tap, nothing reveals the color">

Tapping a pad plays the chord and puts a quick ring around that one button so you know it registered. In Practice mode a little rainbow also arcs up and glows on the color you just played, just for fun.

## Test mode

The gear icon opens Mode settings. Switch to Test and pick who's being tested — Maddie gets all nine colors, Marcus gets the six he's working on (black, blue, red, yellow, green, orange). The grid itself doesn't change at all between Practice and Test (same colors, names, layout, nothing shifts), because it isn't the quiz mechanism — the "Next chord" button inside the settings panel is. Each tap on Next plays the next chord from a pre-shuffled 20-round queue built from that kid's colors (a fair shuffle-and-repeat, so nobody gets a lucky streak of the same three colors). Nothing on screen ties a Next-triggered chord to any specific pad, so the grid can stay fully labeled without spoiling anything.

## Running it

```
npm install
npm run dev
```

Add it to your phone's home screen from the browser (Share → Add to Home Screen on iPhone) and it behaves like a real app — full screen, one tap, no browser chrome.

## Why the notes are in that order

`src/piano.js` always treats the first letter in a color's note list as the one that goes on the bottom, and stacks the rest upward from there. Black's A is the lowest note in the whole app; red's C sits on middle C. If you ever add a color, that's the rule to follow.

The "piano" sound isn't a sample — it's synthesized (a handful of harmonics per note plus a bit of hammer noise and reverb) to get closer to a real piano without shipping actual audio files.

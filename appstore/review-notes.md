# PitchPop — App Review information

Apple asked for this under Guideline 2.1 ("Information Needed — New App
Submission") because the developer account is new. Reply in App Store
Connect with the reply below, attach the screen recording, **and** paste the
same text into App Review Information → Notes so future reviews have it.

Replace everything in `[brackets]` before sending.

---

## Before you reply

1. **Make a demo account** (reviewers need working credentials):
   - In the app, tap **Sign in** (top right) → **Create account**.
   - Use an address you control, e.g. `pitchpop.review@[your domain or a Gmail alias]`.
   - Open the confirmation email and confirm it, then sign in once in the app
     to prove it works.
   - Put the email and password into App Store Connect → App Review
     Information → **Sign-in required: on**, User name / Password.
     Only there: this repository is public, so never write the password in
     this file or anywhere else in the repo.
2. **Voice license (done).** The voice's MODEL_CARD lists its dataset
   (Hi-Fi-CAPTAIN, NICT) as CC BY-NC-SA 4.0: non-commercial, with credit.
   Fine for a free app with no ads; it's credited in the Credits section of
   `public/privacy.html`. If PitchPop is ever paid or shows ads, switch to a
   voice whose license allows commercial use.
3. **Check account deletion works.** The database function from
   `supabase/delete_my_account.sql` is installed (run on 2026-09-28). Create a *throwaway*
   account in the app, go to Account → **Delete account**, and confirm it
   signs you out and the account can no longer sign in. If this fails, Apple
   will reject under 5.1.1(v).
4. **Use the newest build.** On the version page, under **Build**, remove
   the old build and choose the newest TestFlight build (1.0 (8) or later,
   uploaded automatically by GitHub Actions) before resubmitting, so the
   reviewer sees what this reply describes.
5. **Record the screen** on your iPhone (see the checklist at the bottom)
   using that same build from TestFlight.

---

## Reply to App Review (and Notes field)

Hello, and thank you for reviewing PitchPop.

**1. Screen recording**
Attached is a screen recording made on a physical iPhone running
[iOS version, from Settings → General → About]. It starts at launch and shows
the typical flow: the home page, a full round of the chord-color game
(listening, a correct and an incorrect answer), Explore, the Piano, Practice
Mode (timer, metronome, repetition counter and practice tokens), then, signed
in, the NoteSpeller note-reading game on treble and bass clefs, the Music
Theory glossary, player settings, and account creation, sign-in, sign-out and
in-app account deletion. PitchPop has no
user-generated content shared with other users and no paid content or
in-app purchases.

**2. Purpose and audience**
PitchPop is an ear-training and music-reading game for children, played
together with a parent or teacher, and for beginners of any age. Each chord
has a color; the player listens to a chord and picks its color, and after
every answer the app plays the chord's real notes and says the color. A
second game, NoteSpeller, shows a note on a treble or bass staff, lets the
player hear it, and asks them to name it (easy, medium and hard levels).
Alongside the games there is a playable on-screen Piano, a Practice Mode
for real-instrument practice (a practice timer, a metronome, a repetition
counter, and tokens the child collects for every 5 minutes practised), and a
Music Theory picture glossary of basic terms. It turns early ear training and note reading,
which usually needs a piano and a teacher, into a short daily game. A family can set up separate players, each learning their own set of
colors, and see a daily practice streak.

**3. How to use the main features**
No account is needed to play. PitchPop opens on its home page, which has a
button for every part of the app: tap "Pitch Practice" to start playing.
- Menu: the ☰ button at the top left also opens every part of the app,
  grouped into Play, Learn and Practice, with "Home" and "Pitch Practice" first.
- About: "How it works" on the home page (or ☰ → About) explains the
  Eguchi method the chord game is based on.
- Chord game: tap the rainbow to hear a chord, pick a color, then Next.
- Explore sounds: tap any color to hear its chord.
- Piano: turn the phone sideways to play; the keyboard appears in landscape.
  Tap Done to return.
- Practice Mode: Start practice / End practice timer (practices of 5 minutes
  or more are saved and earn one token per 5 minutes); a metronome (Start,
  − / + or the slider for tempo); and a repetition counter (tap the number
  to count, − / + to adjust, Start over to reset).
- "Playing as" (top right) switches between the family's players.
- Signed in, the menu also shows Learn, and "Playing as" also shows
  Players & colors:
  - NoteSpeller: choose Treble or Bass clef and a level, tap "Hear", then
    pick the letter.
  - Music Theory: a picture glossary; the buttons at the top filter by topic.
  - Players & colors: add players and choose the colors each one learns.
- Account: tap "Sign in" at the top right. Please use the demo account
  whose email and password are in the Sign-In Information fields of this
  submission, or create your own (a confirmation email is sent). The
  account syncs the family's players and colors between devices. Account
  deletion is at Account (the circle at the top right) → Delete account; it
  deletes the account and its players.

**4. External services**
- Supabase (supabase.com): email/password sign-in and storage of each
  family's player names and color settings, used only when the user chooses
  to create an account.
No other services are used. There are no ads, analytics, tracking, payments
or AI services. Sound and speech are generated on the device: the piano is
synthesized in the app, and the voice is an open-source Piper text-to-speech
model bundled inside the app, so the games work fully offline.

**5. Regions**
The app works the same in all regions. Its interface is in English only, and
no features or content differ by region.

**6. Regulated industry / third-party material**
PitchPop does not operate in a regulated industry and contains no protected
third-party material. Bundled open-source components are used under their
licenses: the Piper text-to-speech engine and ONNX Runtime (MIT); the Piper voice
"en_US-hfc_female-medium", trained on the Hi-Fi-CAPTAIN dataset by NICT and
used under CC BY-NC-SA 4.0 in this free, non-commercial app, with credit in
the Credits section of our privacy policy
(https://marikalam.github.io/apps/pitchpop/privacy.html); the Fredoka and
IBM Plex fonts and the Bravura music font's clef and note shapes (SIL Open
Font License 1.1). The piano sounds are synthesized by the app itself.

Thank you!
Marika Lam

---

## Screen recording checklist

Record on a **physical iPhone on the latest iOS** (Settings → General →
Software Update first). Add Screen Recording to Control Center (Settings →
Control Center), and turn the ringer/volume up so the app's sound is
captured.

1. Start recording from the Home Screen, then **launch PitchPop** (the video
   must begin with the launch).
2. Show the **home page**, then tap **Pitch Practice**.
3. Play the **chord game**: tap the rainbow, answer one correctly and one
   incorrectly, show the feedback, finish or go a few rounds.
4. Open **Explore sounds** and tap a few colors.
5. Open **Piano** (☰ menu), turn the phone sideways, play a few keys, tap
   **Done**.
6. Open **Practice Mode** (☰ menu): Start practice, start and stop the
   **metronome**, tap the counter number a few times, End practice.
7. **Account flows:** Sign in → Create account with a throwaway email (show
   the "check your email" message), then sign in with the **demo account**.
   Signed in, open **NoteSpeller** (☰ → Learn): answer a note on **Treble
   clef**, tap **Hear**, switch to **Bass clef**, answer another. Open
   **Music Theory** and tap a topic button. Open **Players & colors**
   ("Playing as" menu), show adding a player, then Cancel. Show the Account
   screen and **Sign out**.
8. **Account deletion:** sign in with a throwaway account that's already
   confirmed, go to Account → **Delete account**, confirm, and show that
   you're signed out.
9. Stop recording. Keep it under a few minutes; trim the start/end in Photos
   if needed, but keep the launch.

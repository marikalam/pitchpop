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
4. **Record the screen** on your iPhone (see the checklist at the bottom).

---

## Reply to App Review (and Notes field)

Hello, and thank you for reviewing PitchPop.

**1. Screen recording**
Attached is a screen recording made on a physical iPhone running
[iOS version, from Settings → General → About]. It starts at launch and shows
the typical flow: the intro screen, a full round of the chord-color game
(listening, a correct and an incorrect answer), Explore, the NoteSpeller
note-reading game on treble and bass clefs, player settings, and account
creation, sign-in, sign-out and in-app account deletion. PitchPop has no
user-generated content shared with other users and no paid content or
in-app purchases.

**2. Purpose and audience**
PitchPop is an ear-training and music-reading game for children, played
together with a parent or teacher, and for beginners of any age. Each chord
has a color; the player listens to a chord and picks its color, and after
every answer the app plays the chord's real notes and says the color. A
second game, NoteSpeller, shows a note on a treble or bass staff, lets the
player hear it, and asks them to name it. It turns early ear training and
note reading, which usually needs a piano and a teacher, into a short daily
game. A family can set up separate players, each learning their own set of
colors, and see a daily practice streak.

**3. How to use the main features**
No account is needed. On first launch, tap "Take the color test" on the
intro screen to start playing.
- Chord game: tap the rainbow to hear a chord, pick a color, then Next.
- Explore and NoteSpeller: open the "Playing as" menu (top right) and choose
  "Explore sounds" or "NoteSpeller". In NoteSpeller, choose Treble clef or
  Bass clef, tap "Hear the note", then pick the letter.
- Players & colors: "Playing as" menu → Players & colors.
- Optional account (only syncs players and colors between devices): tap
  "Sign in" at the top right. Demo account:
  the demo account's email and password are in the Sign-In Information
  fields of this submission.
  Please feel free to create your own account as well. Account deletion is at
  Account (the circle at top right) → Delete account.

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
2. Show the **intro** screen and tap **Take the color test**.
3. Play the **chord game**: tap the rainbow, answer one correctly and one
   incorrectly, show the feedback, finish or go a few rounds.
4. Open **Explore sounds** and tap a few colors.
5. Open **NoteSpeller**: answer a note on **Treble clef**, tap **Hear the
   note**, switch to **Bass clef**, answer another.
6. Open **Players & colors**, show adding a player, then cancel.
7. **Account flows:** Sign in → Create account with a throwaway email (show
   the "check your email" message), then sign in with the **demo account**,
   show the Account screen, **Sign out**.
8. **Account deletion:** sign in with a throwaway account that's already
   confirmed, go to Account → **Delete account**, confirm, and show that
   you're signed out.
9. Stop recording. Keep it under a few minutes; trim the start/end in Photos
   if needed, but keep the launch.

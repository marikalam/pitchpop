// "About the Eguchi method": where PitchPop's colors come from, how the
// traditional method works, and how to practise with the app.

// The method's nine white-key chords are C, F and G major, each in its
// three positions (root, then 1st and 2nd inversion) - PitchPop's colors.
const FAMILIES = [
  { chord: 'C chords', colors: ['red', 'orange', 'brown'] },
  { chord: 'F chords', colors: ['purple', 'black', 'yellow'] },
  { chord: 'G chords', colors: ['pink', 'blue', 'green'] },
];

export default function MethodInfo({ colors, signedIn }) {
  const byName = (name) => colors.find((c) => c.name === name);

  return (
    <div className="method">
      <h2 className="screen-title">The Eguchi method</h2>

      <section className="method-card">
        <p className="method-lead">
          PitchPop is based on the <strong>Eguchi method</strong>, a way of teaching young children to recognize chords
          by ear, developed by music educators in Japan.
        </p>
        <p>
          Every chord gets its own color. In the traditional lessons, a grown-up plays a chord on the piano and the child
          holds up a flag in that chord’s color: red for C–E–G, for example. PitchPop works the same way: it plays the
          chord, and your child taps the color.
        </p>
      </section>

      <section className="method-card">
        <h3 className="method-heading">🎨 The nine colors</h3>
        <p>
          The method starts with nine chords made only of white keys: the C, F and G chords, each in three positions.
          These are PitchPop’s colors.
        </p>
        <div className="method-chart">
          {FAMILIES.map((family) => (
            <div key={family.chord} className="method-family">
              <span className="method-family-name">{family.chord}</span>
              <div className="method-chips">
                {family.colors.map((name) => {
                  const c = byName(name);
                  return (
                    <span key={name} className="method-chip" style={{ background: c.hex, color: c.text }}>
                      <span className="method-chip-name">{name}</span>
                      <span className="method-chip-notes">{c.notes.join(' ')}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="method-note">
          Once a child knows all nine reliably, the traditional method goes on to chords with black keys, and then to
          hearing the separate notes inside a chord.
        </p>
      </section>

      <section className="method-card">
        <h3 className="method-heading">🔬 The research</h3>
        <p>
          In a long-term study in Japan (Sakakibara, 2014, <em>Psychology of Music</em>), most of the children aged 2 to 6
          who trained with this method developed absolute pitch, also called perfect pitch: naming a note just by hearing
          it. Starting young matters, and the skill needs a little regular practice to keep.
        </p>
      </section>

      <section className="method-card">
        <h3 className="method-heading">🌱 How to practice</h3>
        <ul className="method-tips">
          <li>
            <strong>A few minutes every day</strong> works better than one long session. A round of Pitch Practice is
            ten chords.
          </li>
          <li>
            <strong>Start with two or three colors</strong> and add more as your child is ready (see below).
            {signedIn
              ? ' Choose each player’s colors in Players & colors.'
              : ' With a family account, you choose each player’s colors in Players & colors.'}
          </li>
          <li>
            <strong>Have a piano?</strong> Play the chords yourself and let your child point to the color, like the
            flags in the traditional lessons. Explore shows every color with its notes.
          </li>
        </ul>
      </section>

      <section className="method-card">
        <h3 className="method-heading">➕ When to add a new color</h3>
        <ul className="method-tips">
          <li>
            Add a new color when your child recognizes their current colors with <strong>at least 90% accuracy</strong>{' '}
            on <strong>two different days</strong>.
          </li>
          <li>Keep practicing all the old colors, too.</li>
          <li>If accuracy stays at 90% or higher, add the next color.</li>
          <li>
            If it drops <strong>below 80%</strong>, remove the newest color or practice with fewer colors until accuracy
            is steady again.
          </li>
        </ul>
        <p className="method-note">
          No rush: progress is based on how your child does, not the calendar. The end of each Pitch Practice round
          shows how many of the 10 chords were correct: 9 or 10 is 90% or more.
        </p>
      </section>
    </div>
  );
}

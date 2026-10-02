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
          In a long-term study in Japan (Sakakibara, 2014, <em>Psychology of Music</em>), 24 children aged 2 to 6 trained
          with this method, and every child who kept practicing (22 of them) developed absolute pitch, also called perfect
          pitch: naming a note just by hearing it. It took about one to two years of regular practice.
        </p>
      </section>

      <section className="method-card">
        <h3 className="method-heading">👶 The best age</h3>
        <p>
          <strong>Start between ages 2 and 6</strong>: that’s the age of the children in the study, and the younger the
          better. The ability to learn perfect pitch fades after about age 6 to 7, and adults almost never can. Older
          children and grown-ups still train their ear with PitchPop, just not usually to perfect pitch.
        </p>
      </section>

      <section className="method-card">
        <h3 className="method-heading">🌱 How to practice</h3>
        <ul className="method-tips">
          <li>
            <strong>4 to 5 short sessions a day</strong>, each just 2 to 5 minutes (about 20 to 25 chords, or one round
            of Pitch Practice), spread through the day. That’s how the method is designed. If that’s too many, aim for at
            least 3 a day.
          </li>
          <li>
            <strong>Every day, for one to two years.</strong> Short and often works much better than one long session.
          </li>
          <li>
            <strong>Start with one color</strong>, red (C–E–G), and add the next one when your child is ready (see
            below).
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
          shows how many of the 20 chords were correct: 18 or more is 90% or more.
        </p>
      </section>
    </div>
  );
}

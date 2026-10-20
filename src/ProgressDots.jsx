// The row of dots across the top of Pitch Practice, NoteSpeller and the
// Theory quiz: one per question, with how far along the round is.
// - outcomes ({ [index]: true | false }, first try) turns an answered
//   dot green (right) or red (wrong);
// - kinds (a smart round's plan, smartRound.js) colors the dots still to
//   come: an easy start and finish, last round's misses and the mix-up
//   checks.
export default function ProgressDots({ current, total, kinds, outcomes = {} }) {
  const items = [];
  for (let i = 1; i <= total; i++) {
    const kind = kinds?.[i - 1];
    const outcome = outcomes[i - 1];
    const result = outcome === true ? ' progress-dot-right' : outcome === false ? ' progress-dot-wrong' : '';
    items.push(
      <span
        key={`d${i}`}
        className={`progress-dot${i <= current ? ' progress-dot-filled' : ''}${kind && kind !== 'regular' ? ` progress-dot-${kind}` : ''}${result}${i === current ? ' progress-dot-now' : ''}`}
      />,
    );
    if (i < total) {
      items.push(<span key={`l${i}`} className={`progress-line${i < current ? ' progress-line-filled' : ''}`} />);
    }
  }
  return (
    <div className="progress-wrap">
      <div className={`progress-dots${total > 12 ? ' progress-dots-many' : ''}`}>{items}</div>
      <span className="progress-count">
        {current} / {total}
      </span>
    </div>
  );
}

// Whether this device keeps a player's records: streak days, rounds and
// practice time. Only for signed-in families; guests can use everything,
// but nothing they do is recorded. App.jsx sets it from the sign-in.
let keep = false;

export function setKeepRecords(on) {
  keep = on;
}

export function keepsRecords() {
  return keep;
}

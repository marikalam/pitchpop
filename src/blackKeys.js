// Chords with a black key (light green: A, C♯, E; beige: D, F♯, A) are their own group:
// the white-key chords come first, and Explore only shows a black-key
// chord to a player who's learning it in Pitch Practice.
export const usesBlackKeys = (color) => color.notes.some((n) => n.includes('#'));

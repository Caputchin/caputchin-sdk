// Translate a DOM `KeyboardEvent.key` to the KAPLAY key name an author writes in
// `defineKaplayGame`'s `keys` option. The live driver feeds keyboard input through
// the iframe document (not KAPLAY's canvas-bound listener, which only fires while
// the canvas is the focused element - unreliable inside the sandboxed game iframe),
// so it must reproduce KAPLAY's OWN normalization exactly: the action a key fires
// must match what KAPLAY would have reported for the same physical key.
//
// KAPLAY's mapping (verified against the pinned kaplay@3001 build, `Me.keydown`)
// is a tiny special-case table - the four arrows and space - with
// `event.key.toLowerCase()` for everything else. Every other `Key`-type member
// (letters, digits, F-keys, and punctuation such as '-' '=' '[' ']' '\\' '`')
// already equals its lower-cased DOM name, so the fallback covers them with no
// enumeration and no risk of a wrong guess (KAPLAY has NO 'minus'/'equal'-style
// names - the punctuation keys ARE the literal characters).
const SPECIAL: Readonly<Record<string, string>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ' ': 'space',
};

/** DOM `KeyboardEvent.key` -> the KAPLAY key name (matches KAPLAY's mapping). */
export function domKeyToKaplay(key: string): string {
  return SPECIAL[key] ?? key.toLowerCase();
}

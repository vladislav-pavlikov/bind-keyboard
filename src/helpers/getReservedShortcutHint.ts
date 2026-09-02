import type { KeyCombination } from "../types";

// ctrl (Windows/Linux) and meta (macOS Cmd) don't share the same shortcuts
// per letter, so these are two independent, deliberately conservative lists
// — only combinations that are genuinely a plain, un-modified reserved
// shortcut on that platform's mainstream browsers are included. (No shift-
// or option-modified variants, e.g. Cmd+Shift+J for Downloads, since this
// only checks bare ctrl/meta + letter combinations.)
const CTRL_RESERVED_DESCRIPTIONS: Record<string, string> = {
  p: "Print",
  s: "Save",
  f: "Find in page",
  g: "Find next",
  d: "Bookmark this page",
  u: "View page source",
  r: "Reload the page",
  l: "Focus the address bar",
  h: "Browser history",
  j: "Downloads",
  n: "New window",
  t: "New tab",
  w: "Close tab",
};

const META_RESERVED_DESCRIPTIONS: Record<string, string> = {
  p: "Print",
  s: "Save",
  f: "Find in page",
  g: "Find next",
  d: "Bookmark this page",
  r: "Reload the page",
  l: "Focus the address bar",
  n: "New window",
  t: "New tab",
  w: "Close tab",
  q: "Quit the application",
  h: "Hide the application",
};

const RESERVED_COMBINATIONS = new Map<KeyCombination, string>([
  ...Object.entries(CTRL_RESERVED_DESCRIPTIONS).map(
    ([key, description]) => [`ctrl + ${key}`, description] as const,
  ),
  ...Object.entries(META_RESERVED_DESCRIPTIONS).map(
    ([key, description]) => [`meta + ${key}`, description] as const,
  ),
]);

/**
 * Looks up whether a normalized key combination commonly collides with a
 * well-known browser or OS shortcut (e.g. "ctrl + p" -> Print). Returns a
 * short human-readable description of what it usually does, or `undefined`
 * if the combination isn't a well-known reservation.
 *
 * Purely informational — the library never blocks registration or calls
 * `preventDefault()` on the consumer's behalf.
 *
 * @param {KeyCombination} combination - A normalized key combination, e.g. "ctrl + p".
 * @returns {string | undefined} What the combination usually does, if known.
 */
const getReservedShortcutHint = (
  combination: KeyCombination,
): string | undefined => RESERVED_COMBINATIONS.get(combination);

export default getReservedShortcutHint;

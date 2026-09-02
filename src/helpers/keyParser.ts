import compact from "lodash/compact";
import isString from "lodash/isString";
import last from "lodash/last";

import type {
  KeyMode,
  KeyCombination,
  KeyCombinationConstruct,
} from "../types";
import getKeyCombination from "./getKeyCombination";
import isMacPlatform from "./isMacPlatform";

// Best-guess `code` for a single character, used only when parsing a string
// key combination (which carries no `code` of its own) under `mode: "code"`.
// Mirrors getKeyCombination's normalizeKeyFromCode in reverse for the common
// cases: letters, digits, and standard US-layout punctuation.
const PUNCTUATION_TO_CODE: Record<string, string> = {
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
  ";": "Semicolon",
  "'": "Quote",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  "-": "Minus",
  "=": "Equal",
  "`": "Backquote",
};

// Only unshifted base characters are covered — for keyMode: "code", combine
// the base key with an explicit "shift" token (e.g. "ctrl+shift+/") rather
// than a shifted glyph like "?", which this cannot resolve to a code.
const guessCodeFromKey = (key?: string): string | undefined => {
  if (key?.length !== 1) return undefined;
  if (/^[a-z]$/u.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/u.test(key)) return `Digit${key}`;
  return PUNCTUATION_TO_CODE[key];
};

/**
 * Parses the key combination into a standardized format.
 *
 * @param {KeyCombination | KeyCombinationConstruct} keyCombination - The key combination to parse. A string form may use "cmdOrCtrl" as a platform-neutral modifier that resolves to metaKey on Mac or ctrlKey elsewhere (e.g. "cmdOrCtrl+a").
 * @param {KeyMode} [mode='key'] - Key matching mode: 'key' uses event.key, 'code' uses event.code (layout-agnostic).
 * @returns {KeyCombination} The standardized key combination.
 */
const keyParser = (
  keyCombination: KeyCombination | KeyCombinationConstruct,
  mode: KeyMode = "key",
): KeyCombination => {
  if (isString(keyCombination)) {
    const p = compact(
      keyCombination.toLowerCase().replaceAll(" ", "").split("+"),
    );

    // "cmdOrCtrl" is a platform-neutral alias, not a real modifier — it
    // resolves to metaKey on Mac or ctrlKey elsewhere *before* reaching
    // getKeyCombination, which only ever knows about the four real
    // KeyboardEvent modifier flags. It's excluded from `key` the same way
    // "ctrl"/"shift"/"alt"/"meta" already never end up as the base key
    // unless they're the only token present.
    const isModPressed = p.includes("cmdorctrl");
    const key = last(p.filter((token) => token !== "cmdorctrl"));

    return getKeyCombination(
      {
        ctrlKey: p.includes("ctrl") || (isModPressed && !isMacPlatform()),
        shiftKey: p.includes("shift"),
        altKey: p.includes("alt"),
        metaKey: p.includes("meta") || (isModPressed && isMacPlatform()),
        key,
        code: guessCodeFromKey(key),
      },
      mode,
    );
  }

  return getKeyCombination(keyCombination, mode);
};

export default keyParser;

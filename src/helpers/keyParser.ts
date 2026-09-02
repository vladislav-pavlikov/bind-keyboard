import compact from "lodash/compact";
import isString from "lodash/isString";
import last from "lodash/last";

import type {
  KeyMode,
  KeyCombination,
  KeyCombinationConstruct,
} from "../types";
import getKeyCombination from "./getKeyCombination";

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
 * @param {KeyCombination | KeyCombinationConstruct} keyCombination - The key combination to parse.
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
    const key = last(p);

    return getKeyCombination(
      {
        ctrlKey: p.includes("ctrl"),
        shiftKey: p.includes("shift"),
        altKey: p.includes("alt"),
        metaKey: p.includes("meta"),
        key,
        code: guessCodeFromKey(key),
      },
      mode,
    );
  }

  return getKeyCombination(keyCombination, mode);
};

export default keyParser;

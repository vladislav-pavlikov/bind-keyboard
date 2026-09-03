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
 * @param {boolean} [ignoreModifiers=false] - When true, any ctrl/shift/alt/meta/cmdOrCtrl tokens (or construct properties) are ignored — used for "keyup" bindings. See getKeyCombination.
 * @returns {KeyCombination} The standardized key combination.
 */
const keyParser = (
  keyCombination: KeyCombination | KeyCombinationConstruct,
  mode: KeyMode = "key",
  ignoreModifiers = false,
): KeyCombination => {
  if (typeof keyCombination === "string") {
    const normalized = keyCombination.toLowerCase().replaceAll(" ", "");

    // "+" is the modifier/key separator everywhere else in this syntax, so
    // a plain split("+") can never represent the literal "+" key itself —
    // "ctrl++" would silently lose its base key and parse as bare "ctrl"
    // instead (mousetrap and hotkeys-js both have issues/tests for exactly
    // this: "+" doesn't work — mousetrap's "binding plus key alone should
    // work"/"binding to alt++ should work"). A trailing "+" is unambiguous
    // though: nothing can legally follow the base key, so a "+" in that
    // position always means the key itself, never a separator with an
    // empty next token. Stripping it before splitting leaves only real
    // modifier tokens for the rest of the string to parse normally.
    const literalPlusKey = normalized.endsWith("+");
    const p = (literalPlusKey ? normalized.slice(0, -1) : normalized)
      .split("+")
      .filter(Boolean);

    // "cmdOrCtrl" is a platform-neutral alias, not a real modifier — it
    // resolves to metaKey on Mac or ctrlKey elsewhere *before* reaching
    // getKeyCombination, which only ever knows about the four real
    // KeyboardEvent modifier flags. It's excluded from `key` the same way
    // "ctrl"/"shift"/"alt"/"meta" already never end up as the base key
    // unless they're the only token present.
    const isModPressed = p.includes("cmdorctrl");
    const nonModTokens = p.filter((token) => token !== "cmdorctrl");
    const [key] = literalPlusKey ? ["+"] : nonModTokens.slice(-1);

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
      ignoreModifiers,
    );
  }

  return getKeyCombination(keyCombination, mode, ignoreModifiers);
};

export default keyParser;

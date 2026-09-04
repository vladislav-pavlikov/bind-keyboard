import type {
  KeyMode,
  KeyCombination,
  KeyCombinationConstruct,
} from "../types";
import KeybindError from "../classes/KeybindError";
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

// The four real modifier words a combination string can spell out — used
// only to tell a genuine second key apart from a lone modifier acting as
// the base key itself (e.g. "ctrl" alone, or "ctrl+shift" for tapping
// Shift while Ctrl is held) when checking for more than one real key
// below. Not the same list as getKeyCombination's own MODIFIER_ALIASES,
// which also covers raw KeyboardEvent codes like "controlleft" — those
// never appear in a hand-written combination string.
const MODIFIER_ALIASES_SET = new Set(["ctrl", "shift", "alt", "meta"]);

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

    // A real KeyboardEvent only ever carries one non-modifier key at a time
    // (event.key/event.code) alongside its four boolean modifier flags —
    // there's nowhere to put a second one. Unlike hotkeys-js (which tracks
    // its own Set of currently-held keys across separate keydown/keyup
    // events to support chords like "ctrl+a+s"), bind-keyboard resolves a
    // combination from a single event, so "ctrl+a+s" can never actually
    // match. Silently keeping only the last token here (the previous
    // behavior) registered "ctrl+s" with zero indication "a" had been
    // dropped — throwing instead surfaces the mistake at registration time,
    // e.g. for anyone porting a combination string over from hotkeys-js.
    // Real modifier words are excluded here too (not just "cmdorctrl"): a
    // lone modifier as the base key (e.g. "ctrl" by itself, or "ctrl+shift"
    // for tapping Shift while Ctrl is held) is a legitimate, already-tested
    // binding, not a second "real" key.
    const realKeyTokens = nonModTokens.filter(
      (token) => !MODIFIER_ALIASES_SET.has(token),
    );
    if (!literalPlusKey && realKeyTokens.length > 1) {
      throw new KeybindError(
        `"${keyCombination}" has more than one non-modifier key (${realKeyTokens.join(", ")}) — only one real key is matched per binding, plus modifiers. Use a sequence ("${realKeyTokens.join(",")}") or separate bindings instead.`,
      );
    }

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

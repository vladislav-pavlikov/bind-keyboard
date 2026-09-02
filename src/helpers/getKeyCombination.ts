import uniq from "lodash/uniq";
import compact from "lodash/compact";

import KeybindError from "../classes/KeybindError";
import type {
  KeyMode,
  KeyCombinationConstruct,
  KeyCombination,
} from "../types";

// A lone modifier press (e.g. tapping Control by itself) sets its own
// `ctrlKey`/etc. flag *and* carries itself as `event.key`/`event.code`
// ("Control"/"ControlLeft"). Without this table, that base key would be
// appended alongside the flag's own token instead of collapsing into it —
// e.g. "ctrl + control" instead of plain "ctrl" — so a binding registered as
// "ctrl" would never match a real standalone Ctrl keydown. Left/Right
// variants collapse the same way the modifier flags themselves do (there's
// only one `ctrlKey` boolean regardless of which side was pressed).
const MODIFIER_ALIASES: Record<string, string> = {
  control: "ctrl",
  controlleft: "ctrl",
  controlright: "ctrl",
  shift: "shift",
  shiftleft: "shift",
  shiftright: "shift",
  alt: "alt",
  altleft: "alt",
  altright: "alt",
  meta: "meta",
  metaleft: "meta",
  metaright: "meta",
};

const normalizeKeyFromKey = (key?: string): string | undefined => {
  if (key === " ") return "space";
  const lower = key?.toLowerCase();
  return lower === undefined ? undefined : (MODIFIER_ALIASES[lower] ?? lower);
};

const normalizeKeyFromCode = (code?: string): string | undefined => {
  if (!code) return undefined;
  if (/^Key[A-Z]$/u.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/u.test(code)) return code.slice(5);
  if (code === "Space") return "space";
  const lower = code.toLowerCase();
  return MODIFIER_ALIASES[lower] ?? lower;
};

// Reduces ctrlKey/shiftKey/altKey/metaKey to what should actually count
// toward this combination — all `false` when `ignoreModifiers` (used for
// "keyup", see getKeyCombination below), otherwise passed through as-is.
const resolveEffectiveModifiers = (
  { ctrlKey, shiftKey, altKey, metaKey }: KeyCombinationConstruct,
  ignoreModifiers: boolean,
): [ctrl: boolean, shift: boolean, alt: boolean, meta: boolean] =>
  ignoreModifiers
    ? [false, false, false, false]
    : [Boolean(ctrlKey), Boolean(shiftKey), Boolean(altKey), Boolean(metaKey)];

/**
 * Gets a standardized key combination from a KeyCombinationConstruct.
 *
 * @param {KeyCombinationConstruct} param - The object containing key combination properties.
 * @param {KeyMode} [mode='key'] - Which KeyboardEvent property to read the base key from: "key" uses `event.key` (layout-sensitive), "code" uses `event.code` (physical key position, layout-agnostic).
 * @param {boolean} [ignoreModifiers=false] - When true, ctrlKey/shiftKey/altKey/metaKey are treated as unset — used for "keyup" bindings, where whatever else happens to still be held at release time usually isn't the point (see BindKeyboard#resolveKeyCombination).
 * @returns {KeyCombination} The standardized key combination.
 */
const getKeyCombination = (
  construct: KeyCombinationConstruct,
  mode: KeyMode = "key",
  ignoreModifiers = false,
): KeyCombination => {
  const { key, code } = construct;
  const [ctrl, shift, alt, meta] = resolveEffectiveModifiers(
    construct,
    ignoreModifiers,
  );

  if (!ctrl && !shift && !alt && !meta && !key && !code) {
    throw new KeybindError("At least one key or modifier must be provided.");
  }

  const normalizedKey =
    mode === "code" ? normalizeKeyFromCode(code) : undefined;
  const keyToken = normalizedKey ?? normalizeKeyFromKey(key);

  return uniq(
    compact([
      ctrl && "ctrl",
      shift && "shift",
      alt && "alt",
      meta && "meta",
      keyToken,
    ]),
  ).join(" + ");
};

export default getKeyCombination;

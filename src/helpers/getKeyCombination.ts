import uniq from "lodash/uniq";
import compact from "lodash/compact";

import KeybindError from "../classes/KeybindError";
import type {
  KeyMode,
  KeyCombinationConstruct,
  KeyCombination,
} from "../types";

const normalizeKeyFromKey = (key?: string): string | undefined =>
  key === " " ? "space" : key?.toLowerCase();

const normalizeKeyFromCode = (code?: string): string | undefined => {
  if (!code) return undefined;
  if (/^Key[A-Z]$/u.test(code)) return code.slice(3).toLowerCase();
  if (/^Digit\d$/u.test(code)) return code.slice(5);
  if (code === "Space") return "space";
  return code.toLowerCase();
};

/**
 * Gets a standardized key combination from a KeyCombinationConstruct.
 *
 * @param {KeyCombinationConstruct} param - The object containing key combination properties.
 * @param {KeyMode} [mode='key'] - Which KeyboardEvent property to read the base key from: "key" uses `event.key` (layout-sensitive), "code" uses `event.code` (physical key position, layout-agnostic).
 * @returns {KeyCombination} The standardized key combination.
 */
const getKeyCombination = (
  { ctrlKey, shiftKey, altKey, metaKey, key, code }: KeyCombinationConstruct,
  mode: KeyMode = "key",
): KeyCombination => {
  if (!ctrlKey && !shiftKey && !altKey && !metaKey && !key && !code) {
    throw new KeybindError(
      "Not one key is defined. Enter at least 1 parameter",
    );
  }
  const normalizedKey =
    mode === "code" ? normalizeKeyFromCode(code) : undefined;

  const keyToken = normalizedKey ?? normalizeKeyFromKey(key);

  return uniq(
    compact([
      ctrlKey && "ctrl",
      shiftKey && "shift",
      altKey && "alt",
      metaKey && "meta",
      keyToken,
    ]),
  ).join(" + ");
};

export default getKeyCombination;

import compact from "lodash/compact";
import isString from "lodash/isString";
import last from "lodash/last";

import type {
  KeyMode,
  KeyCombination,
  KeyCombinationConstruct,
} from "../types";
import getKeyCombination from "./getKeyCombination";

/**
 * Parses the key combination into a standardized format.
 *
 * @param {KeyCombination | KeyCombinationConstruct} keyCombination - The key combination to parse.
 * @param {KeyMode} [mode='key'] - Which KeyboardEvent property to read the base key from: "key" uses `event.key` (layout-sensitive), "code" uses `event.code` (physical key position, layout-agnostic).
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
    return getKeyCombination(
      {
        ctrlKey: p.includes("ctrl"),
        shiftKey: p.includes("shift"),
        altKey: p.includes("alt"),
        metaKey: p.includes("meta"),
        key: last(p),
      },
      mode,
    );
  }

  return getKeyCombination(keyCombination, mode);
};

export default keyParser;

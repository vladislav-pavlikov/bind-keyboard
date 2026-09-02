import compact from "lodash/compact";
import isString from "lodash/isString";
import last from "lodash/last";

import type { KeyСombination, KeyСombinationConstruct } from "../types";
import getKeyCombination from "./getKeyCombination";

/**
 * Parses the key combination into a standardized format.
 *
 * @param {KeyСombination | KeyСombinationConstruct} keyCombination - The key combination to parse.
 * @returns {KeyСombination} The standardized key combination.
 */
const keyParser = (
  keyCombination: KeyСombination | KeyСombinationConstruct,
): KeyСombination => {
  if (isString(keyCombination)) {
    const p = compact(
      keyCombination.toLowerCase().replaceAll(" ", "").split("+"),
    );
    return getKeyCombination({
      ctrlKey: p.includes("ctrl"),
      shiftKey: p.includes("shift"),
      altKey: p.includes("alt"),
      metaKey: p.includes("meta"),
      key: last(p),
    });
  }

  return getKeyCombination(keyCombination);
};

export default keyParser;

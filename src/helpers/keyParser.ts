import compact from "lodash/compact";
import isString from "lodash/isString";
import last from "lodash/last";

import type { KeyСombination, KeyСombinationConstruct } from "../types";
import getKeyСombination from "./getKeyСombination";

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
    return getKeyСombination({
      ctrlKey: p.includes("ctrl"),
      shiftKey: p.includes("shift"),
      altKey: p.includes("alt"),
      metaKey: p.includes("meta"),
      key: last(p),
    });
  }

  return getKeyСombination(keyCombination);
};

export default keyParser;

import uniq from "lodash/uniq";
import compact from "lodash/compact";

import KeybindError from "../classes/KeybindError";
import type { KeyСombinationConstruct, KeyСombination } from "../types";

/**
 * Gets a standardized key combination from a KeyСombinationConstruct.
 *
 * @param {KeyСombinationConstruct} param - The object containing key combination properties.
 * @returns {KeyСombination} The standardized key combination.
 */
const getKeyCombination = ({
  ctrlKey,
  shiftKey,
  altKey,
  metaKey,
  key,
}: KeyСombinationConstruct): KeyСombination => {
  if (!ctrlKey && !shiftKey && !altKey && !metaKey && !key) {
    throw new KeybindError(
      "Not one key is defined. Enter at least 1 parameter",
    );
  }
  return uniq(
    compact([
      ctrlKey && "ctrl",
      shiftKey && "shift",
      altKey && "alt",
      metaKey && "meta",
      key === " " ? "space" : key?.toLowerCase(),
    ]),
  ).join(" + ");
};

export default getKeyCombination;

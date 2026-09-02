const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

/**
 * Whether a KeyboardEvent's `code` is one of the eight physical modifier
 * keys (Ctrl/Shift/Alt/Meta, either side) — used to tell a bare modifier
 * key's own event apart from a "real" (non-modifier) key's event.
 *
 * @param {string} [code] - A KeyboardEvent's `code` value.
 * @returns {boolean} Whether `code` is a modifier key's code.
 */
const isModifierCode = (code?: string): boolean =>
  code !== undefined && MODIFIER_CODES.has(code);

export default isModifierCode;

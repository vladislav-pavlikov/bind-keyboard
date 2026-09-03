import type { KeyMode } from "../types";
import keyParser from "./keyParser";

// A comma normally separates sequence steps ("g,o") — except "+" is
// already fully reserved as the modifier/key separator *within* one step
// (a literal "+" can never be a step's own base key), so a comma
// immediately preceded by "+" unambiguously means the comma itself is
// the step's base key instead (e.g. "ctrl+," — real, physical Ctrl+Comma,
// not a two-step sequence with an empty second step). This lets a comma
// serve as both the sequence separator and a perfectly ordinary bindable
// key, without either meaning ever being ambiguous.
//
// This used to be a single `/(?<!\+),/u` regex (negative lookbehind), but
// lookbehind assertions throw a SyntaxError — at parse time, crashing the
// whole module for every consumer, not just this function — on Safari/iOS
// below 16.4 (March 2023; see https://caniuse.com/js-regexp-lookbehind).
// tinykeys shipped that same lookbehind and had to revert it for exactly
// this reason (jamiebuilds/tinykeys#85). A manual scan gets the identical
// behavior without relying on syntax large parts of iOS still can't parse.
const splitOnUnescapedComma = (input: string): string[] => {
  const steps: string[] = [];
  let current = "";

  for (let i = 0; i < input.length; i += 1) {
    const { [i]: char } = input;
    if (char === "," && input[i - 1] !== "+") {
      steps.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  steps.push(current);
  return steps;
};

/**
 * Splits a sequence string (e.g. "g,o") into its individual, already-
 * parsed steps (e.g. "g", "o") — or returns undefined if `input` isn't a
 * sequence at all (no separating comma present), so a plain single
 * combination keeps going through the unrelated, existing code path
 * unaffected. Each step is parsed the exact same way a normal single-
 * combination string would be (including "cmdOrCtrl"), so whatever's
 * true of one is true of the other — e.g. a malformed or empty step (a
 * stray "g,,o" or trailing "g,") throws the same KeybindError a
 * malformed plain combination would.
 *
 * @param {string} input - The raw key combination string, as given to `.add()`/`.remove()`/`.getKeybind()`.
 * @param {KeyMode} mode - Passed through to keyParser for every step.
 * @param {boolean} ignoreModifiers - Passed through to keyParser for every step (only meaningful for `"keyup"` sequences).
 * @returns {string[] | undefined} The parsed steps, in order, or undefined if `input` isn't a sequence.
 */
const parseSequence = (
  input: string,
  mode: KeyMode,
  ignoreModifiers: boolean,
): string[] | undefined => {
  const steps = splitOnUnescapedComma(input);
  if (steps.length === 1) return undefined;

  return steps.map((step) => keyParser(step, mode, ignoreModifiers));
};

export default parseSequence;

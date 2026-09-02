import { useEffect, useRef } from "react";
import BindKeyboard from "../index";
import type * as Types from "../types";

/**
 * Extra, optional behavior for `useKeybind` — everything `.add()`'s own
 * `options` accepts (`allowInInputElements`, `override`, `description`,
 * `scope`), plus `.add()`'s own positional `preventRepeat`/`type`
 * arguments, an `enabled` flag to conditionally register without
 * unmounting, and the handful of `BindKeyboard` constructor options that
 * matter per-binding (`target`, `keyMode`, `checkInputElements`,
 * `debug`) — each hook call owns its own instance (see `useKeybind`
 * itself), so there's nowhere else to configure these.
 */
export interface UseKeybindOptions extends Types.AddBindingOptions {
  preventRepeat?: boolean;
  type?: Types.EventType;
  enabled?: boolean;
  target?: EventTarget | HTMLElement;
  keyMode?: Types.KeyMode;
  checkInputElements?: boolean;
  debug?: Types.DebugLevel;
}

/**
 * Binds `callback` to `keyCombination` for as long as the calling
 * component is mounted and `enabled` (default true) — creates its own
 * `BindKeyboard` instance inside a `useEffect` and destroys it on
 * cleanup (unmount, `enabled` turning false, or `keyCombination`/options
 * changing), so a component never leaks a listener past its own
 * lifetime. Because registration only ever happens inside `useEffect`,
 * this is inherently safe to call during server-side rendering — the
 * effect (and so the DOM-touching BindKeyboard instance) simply never
 * runs there at all.
 *
 * `callback` doesn't need to be stable across renders — the latest one
 * is always used (via a ref), without tearing down and recreating the
 * underlying instance just because an inline function changed identity.
 * `keyCombination` and the rest of `options`, however, are compared by
 * their *serialized* content (not by reference), since a new inline
 * array/object literal is otherwise a new reference on every render —
 * comparing by content means passing the exact same combination/options
 * on every render (however the reference got there) never needlessly
 * resubscribes.
 *
 * @param {Types.KeyCombination | Types.KeyCombinationConstruct | Array<Types.KeyCombination | Types.KeyCombinationConstruct>} keyCombination - The key combination(s) (or sequence, e.g. "g,o") to bind.
 * @param {Types.KeybindCallback} callback - Called when `keyCombination` matches. Always the latest one passed in, regardless of when the underlying binding was actually (re)created.
 * @param {UseKeybindOptions} [options={}] - Extra, optional behavior — see `UseKeybindOptions`.
 */
export const useKeybind = (
  keyCombination:
    | Types.KeyCombination
    | Types.KeyCombinationConstruct
    | Array<Types.KeyCombination | Types.KeyCombinationConstruct>,
  callback: Types.KeybindCallback,
  options: UseKeybindOptions = {},
): void => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const {
    preventRepeat = true,
    type = "keypress",
    enabled = true,
    target,
    keyMode,
    checkInputElements,
    debug,
    ...bindingOptions
  } = options;

  const comboKey = JSON.stringify(keyCombination);
  const bindingOptionsKey = JSON.stringify(bindingOptions);

  useEffect(() => {
    if (!enabled) return undefined;

    const bindKeyboard = new BindKeyboard({
      target,
      keyMode,
      checkInputElements,
      debug,
    });

    bindKeyboard.add(
      keyCombination,
      (ev) => {
        callbackRef.current(ev);
      },
      preventRepeat,
      type,
      bindingOptions,
    );

    return () => {
      bindKeyboard.destroy();
    };
    // Deliberately keyed by the serialized comboKey/bindingOptionsKey, not
    // keyCombination/bindingOptions themselves — see the doc comment above.
  }, [
    comboKey,
    bindingOptionsKey,
    preventRepeat,
    type,
    enabled,
    target,
    keyMode,
    checkInputElements,
    debug,
  ]);
};

export default useKeybind;

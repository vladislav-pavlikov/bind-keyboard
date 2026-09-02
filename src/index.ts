import type * as Types from "./types";
import * as Classes from "./classes";
import * as helpers from "./helpers";

/**
 * Logs a single handled (or observed) key event to the console. Module-level
 * because it needs no instance state — `BindKeyboard#listener` decides
 * whether to call it based on the configured debug level.
 */
const logDebugEvent = ({
  ev,
  keyCombination,
  callback,
}: {
  ev: Event;
  keyCombination: Types.KeyCombination;
  callback?: Types.KeybindCallback;
}): void => {
  // eslint-disable-next-line no-console -- this IS the feature: `debug` opts a consumer into console output.
  console.log(
    `%c${ev.type} %c${keyCombination} %c${callback ?? ""}`,
    "color: red",
    "",
    "color: green",
  );
};

/**
 * Manages keyboard event bindings and execution of callback functions for specific key combinations.
 */
class BindKeyboard {
  readonly #target: EventTarget;
  readonly #debug: Types.DebugLevel;
  // Keyed by combination, then by scope (`undefined` for an unscoped/global
  // binding) — lets the same combination carry a separate binding per
  // scope, plus one more with no scope at all, all coexisting. See
  // #resolveEntry for how one gets picked when more than one is present.
  readonly #bindings: Record<
    Types.EventType,
    Map<Types.KeyCombination, Map<string | undefined, Classes.KeybindEntry>>
  >;

  // Scopes currently active — see enableScope/disableScope/setActiveScopes.
  #activeScopes = new Set<string>();

  // Tracks, per event type, the combination whose callback last actually
  // ran — see #listener for why this (not just event.repeat) is what
  // preventRepeat needs to compare against.
  readonly #lastFiredCombination: Record<
    Types.EventType,
    Types.KeyCombination | undefined
  >;

  // The most recently pressed non-modifier key that's still held, if any —
  // see #listener for why a bare modifier key's own event needs this to
  // resolve combinations like "shift + d" reliably.
  #heldKey: { key: string; code: string } | undefined = undefined;

  readonly #checkInputElements: boolean;
  readonly #keyMode: Types.KeyMode;

  /**
   * Creates an instance of the Keybind class.
   *
   * @param {Types.ConstructorProps} [props={}] - Configuration options for the Keybind instance.
   * @param {EventTarget} [props.target=globalThis] - The target element for listening to keyboard events (optional, default is window).
   * @param {Types.DebugLevel} [props.debug=0] - The level of debugging output (0 - None, 1 - Only existing bindings, 2 - All key events) (optional, default is 0).
   * @param {boolean} [props.checkInputElements=true] - Whether to prevent intercepting key events when typing in input fields (optional, default is true). Pass `false` to fire bindings even while an input/textarea/select/contenteditable is focused.
   * @param {boolean} [props.autostart=true] - Whether to start listening for keyboard events immediately (optional, default is true).
   * @param {Types.KeyMode} [props.keyMode='key'] - Key matching mode: 'key' uses event.key, 'code' uses event.code (layout-agnostic).
   * @param {Types.KeybindInitializer[]} [props.initialBindings=undefined] - Initial key bindings to set upon instantiation (optional, default is undefined).
   */
  constructor(props: Types.ConstructorProps = {}) {
    this.#target = props.target || globalThis;
    this.#debug = props.debug || 0;
    this.#bindings = {
      keydown: new Map(),
      keypress: new Map(),
      keyup: new Map(),
    };
    this.#lastFiredCombination = {
      keydown: undefined,
      keypress: undefined,
      keyup: undefined,
    };
    this.#checkInputElements =
      typeof props.checkInputElements === "boolean"
        ? props.checkInputElements
        : true;
    this.#keyMode = props.keyMode || "key";

    if (props.initialBindings) {
      for (const {
        keyCombination,
        callback,
        preventRepeat = true,
        type = "keypress",
        allowInInputElements,
        override,
        description,
        scope,
      } of props.initialBindings) {
        this.add(keyCombination, callback, preventRepeat, type, {
          allowInInputElements,
          override,
          description,
          scope,
        });
      }
    }

    // No addEventListener means there's no real DOM to listen on yet (e.g.
    // this instance was constructed during server-side rendering). Register
    // the bindings above but skip autostart instead of throwing, so a
    // component can still call startListeners() once mounted on the client.
    const canListen = typeof this.#target.addEventListener === "function";
    const shouldAutostart =
      typeof props.autostart === "boolean" ? props.autostart : true;

    if (shouldAutostart && !canListen) {
      // eslint-disable-next-line no-console -- this is the only signal a consumer gets that autostart was skipped; failing silently would be worse.
      console.warn(
        "[bind-keyboard] The target has no addEventListener (likely a non-browser environment, e.g. server-side rendering). Skipped autostart — call startListeners() manually once a DOM is available.",
      );
    }

    if (shouldAutostart && canListen) {
      this.startListeners();
    }
  }

  /**
   * Handles keyboard event listener. Prevents intercepting key events when typing in input fields
   * and manages execution of callback functions based on key combination and event type.
   *
   * @param {Event} ev - The keyboard event.
   */
  /**
   * Keeps #heldKey in sync with real (non-modifier) key presses/releases.
   * Modifier keys are never tracked as a "held key" themselves — they're
   * the thing that gets combined *with* one, not a base key.
   *
   * @param {KeyboardEvent} ev - The keyboard event.
   * @param {Types.EventType} eventType - `ev.type`, narrowed.
   * @param {boolean} isModifierEvent - Whether `ev.code` is a modifier key.
   */
  #trackHeldKey(
    ev: KeyboardEvent,
    eventType: Types.EventType,
    isModifierEvent: boolean,
  ): void {
    if (isModifierEvent) return;

    if (eventType === "keyup") {
      if (this.#heldKey?.code === ev.code) this.#heldKey = undefined;
    } else {
      this.#heldKey = { key: ev.key, code: ev.code };
    }
  }

  /**
   * Resolves the combination this event represents. A bare modifier key's
   * own event only carries information about itself — if some other,
   * non-modifier key is already held (#heldKey), the *actual* current
   * combination is that key plus this event's modifier flags (always
   * live/correct, regardless of which key triggered the event), not
   * whatever the modifier key's own key/code would produce alone. This is
   * what lets holding "d" and then also pressing Shift resolve to
   * "shift + d" the instant Shift goes down, instead of depending on the
   * OS's next auto-repeat of "d" — which is both delayed and not reliably
   * consistent across browsers about updating a repeating key's own
   * modifier flags.
   *
   * @param {KeyboardEvent} ev - The keyboard event.
   * @param {boolean} isModifierEvent - Whether `ev.code` is a modifier key.
   * @returns {Types.KeyCombination} The resolved combination.
   */
  #resolveKeyCombination(
    ev: KeyboardEvent,
    eventType: Types.EventType,
    isModifierEvent: boolean,
  ): Types.KeyCombination {
    // The held-key substitution above is a keydown/keypress concern (a new
    // combination *forming*) — it must not also apply to a modifier's own
    // keyup, or releasing e.g. Shift while "d" is held would resolve to
    // "d" and could trigger a binding meant for releasing "d" itself.
    const heldKey =
      isModifierEvent && eventType !== "keyup" ? this.#heldKey : undefined;

    // "keyup" ignores modifier flags entirely: what else happens to still
    // be held at the moment a key is released isn't usually the point —
    // releasing "d" should reliably fire a "d" keyup binding whether or
    // not Shift is also currently held (e.g. mid-dash), the same way it
    // would if nothing else were held at all.
    return helpers.getKeyCombination(
      {
        ctrlKey: ev.ctrlKey,
        shiftKey: ev.shiftKey,
        altKey: ev.altKey,
        metaKey: ev.metaKey,
        key: heldKey?.key ?? ev.key,
        code: heldKey?.code ?? ev.code,
      },
      this.#keyMode,
      eventType === "keyup",
    );
  }

  /**
   * Picks which entry (if any) registered for this exact combination
   * should actually fire right now: the first entry (in registration
   * order) whose `scope` is currently active, or — if none of the scoped
   * ones are — the unscoped (global) entry, if one was registered. A
   * scope being active always wins over the unscoped entry for the same
   * combination, regardless of which was registered first.
   *
   * @param {Map<string | undefined, Classes.KeybindEntry> | undefined} entriesForCombination - Every entry registered for this combination, keyed by scope (`undefined` for unscoped/global).
   * @returns {Classes.KeybindEntry | undefined} The matching entry, if any.
   */
  #resolveEntry(
    entriesForCombination:
      Map<string | undefined, Classes.KeybindEntry> | undefined,
  ): Classes.KeybindEntry | undefined {
    if (!entriesForCombination) return undefined;

    for (const [scope, entry] of entriesForCombination) {
      if (scope !== undefined && this.#activeScopes.has(scope)) return entry;
    }

    return entriesForCombination.get(undefined);
  }

  readonly #listener = (ev: Event): void => {
    if (!(ev instanceof KeyboardEvent)) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- #listener is only ever registered for keydown/keypress/keyup (see startListeners/stopListeners below), so ev.type is always a Types.EventType.
    const eventType = ev.type as Types.EventType;
    const isModifierEvent = helpers.isModifierCode(ev.code);

    this.#trackHeldKey(ev, eventType, isModifierEvent);

    const keyCombination = this.#resolveKeyCombination(
      ev,
      eventType,
      isModifierEvent,
    );
    const entry = this.#resolveEntry(
      this.#bindings[eventType].get(keyCombination),
    );

    // Do not intercept key events when typing in input fields, unless this
    // specific binding opted in via { allowInInputElements: true }.
    const shouldSkipForInputElement =
      this.#checkInputElements &&
      !entry?.allowInInputElements &&
      helpers.isInputOrTextArea();

    if (shouldSkipForInputElement) return;

    // event.repeat reflects the *physical key* being auto-repeated by the
    // OS, not that this specific combination already fired — if a modifier
    // is pressed or released mid-hold, the same repeating keydown can
    // resolve to a brand-new combination (e.g. holding "d" and then also
    // pressing Shift turns d's next auto-repeat into "shift + d"). Only
    // treat it as a repeat to suppress when it repeats the combination that
    // last actually fired for this event type — not just any repeat of the
    // underlying key — so that new combination still gets its first,
    // legitimate firing.
    const isRepeatOfLastFired =
      ev.repeat && keyCombination === this.#lastFiredCombination[eventType];

    if (isRepeatOfLastFired && entry?.preventRepeat) return;

    if (this.#debug === 2 || (this.#debug === 1 && entry)) {
      logDebugEvent({ ev, keyCombination, callback: entry?.callback });
    }

    if (entry) this.#lastFiredCombination[eventType] = keyCombination;
    entry?.callback(ev);
  };

  /**
   * @extends keyParser
   */
  static keyParser = helpers.keyParser;

  /**
   * @extends helpers.getKeyCombination
   */
  static getKeyCombination = helpers.getKeyCombination;

  /**
   * Gets the binding for a specific key combination, event type, and scope.
   *
   * @param {Types.KeyCombination | Types.KeyCombinationConstruct} keyCombination - The key combination to look up.
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to search (optional, default is 'keypress').
   * @param {string} [scope=undefined] - Look up the binding registered for this specific scope, rather than the unscoped (global) one. Doesn't consider which scopes are currently active — see `.add()`'s `scope` option.
   * @returns {Classes.KeybindEntry | undefined} The key binding entry or undefined if not found.
   */
  getKeybind = (
    keyCombination: Types.KeyCombination | Types.KeyCombinationConstruct,
    type: Types.EventType = "keypress",
    scope?: string,
  ): Classes.KeybindEntry | undefined =>
    this.#bindings[type]
      .get(helpers.keyParser(keyCombination, this.#keyMode, type === "keyup"))
      ?.get(scope);

  /**
   * Gets an array of all key bindings across all event types and scopes.
   *
   * @returns {Classes.KeybindEntry[]} An array of all key bindings.
   */
  getAllBindings = (): Classes.KeybindEntry[] =>
    (["keydown", "keypress", "keyup"] as const).flatMap((type) =>
      [...this.#bindings[type].values()].flatMap((entriesForCombination) => [
        ...entriesForCombination.values(),
      ]),
    );

  /**
   * Adds one or more keyboard event bindings for the given key combination(s).
   *
   * @param {Types.KeyCombination | Types.KeyCombinationConstruct | Array<Types.KeyCombination | Types.KeyCombinationConstruct>} keyCombination - The key combination(s) to bind.
   * @param {Types.KeybindCallback} callback - The callback function to execute when the key combination is pressed.
   * @param {boolean} [preventRepeat=true] - Whether to prevent repeated key press events when holding down the key (optional, default is true).
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to bind (optional, default is 'keypress').
   * @param {Types.AddBindingOptions} [options={}] - Extra, optional behavior for this binding (allowInInputElements, override, description, scope).
   * @returns {Classes.KeybindEntry[]} The binding entries that were created, one per key combination.
   * @throws {Classes.KeybindError} When an invalid EventType is provided, or when a binding already exists for the same combination *and* scope and `options.override` is `false`.
   */
  add = (
    keyCombination:
      | Types.KeyCombination
      | Types.KeyCombinationConstruct
      | Array<Types.KeyCombination | Types.KeyCombinationConstruct>,
    callback: Types.KeybindCallback,
    preventRepeat = true,
    type: Types.EventType = "keypress",
    options: Types.AddBindingOptions = {},
  ): Classes.KeybindEntry[] => {
    if (!["keypress", "keydown", "keyup"].includes(type)) {
      throw new Classes.KeybindError("Wrong EventType.");
    }

    const combinations = Array.isArray(keyCombination)
      ? keyCombination
      : [keyCombination];
    const { [type]: bindingsForType } = this.#bindings;
    const parsedCombinations = combinations.map((combination) =>
      helpers.keyParser(combination, this.#keyMode, type === "keyup"),
    );
    const { scope } = options;
    const scopeLabel = scope ? `, scope "${scope}"` : "";

    if (options.override === false) {
      const seen = new Set<Types.KeyCombination>();
      const conflict = parsedCombinations.find((parsedCombination) => {
        const alreadyExists =
          bindingsForType.get(parsedCombination)?.has(scope) ?? false;

        if (alreadyExists || seen.has(parsedCombination)) return true;

        seen.add(parsedCombination);
        return false;
      });

      if (conflict) {
        throw new Classes.KeybindError(
          `A binding for "${conflict}" (${type}${scopeLabel}) already exists. Pass { override: true } (the default) to replace it.`,
        );
      }
    }

    return parsedCombinations.map((parsedCombination) => {
      const entriesForCombination =
        bindingsForType.get(parsedCombination) ??
        new Map<string | undefined, Classes.KeybindEntry>();

      if (this.#debug) {
        if (entriesForCombination.has(scope)) {
          // eslint-disable-next-line no-console -- surfaces a real footgun (silently replacing a binding) only when the consumer opted into `debug`.
          console.warn(
            `[bind-keyboard] Overwriting existing binding for "${parsedCombination}" (${type}${scopeLabel}).`,
          );
        }

        const reservedShortcutHint =
          helpers.getReservedShortcutHint(parsedCombination);

        if (reservedShortcutHint) {
          // eslint-disable-next-line no-console -- a heads-up only when the consumer opted into `debug`; never blocks registration.
          console.warn(
            `[bind-keyboard] "${parsedCombination}" is commonly used by browsers/OS for "${reservedShortcutHint}". Some browsers let a page override this with event.preventDefault() in the callback; others (e.g. new tab/window, close tab, quit) never dispatch the event to the page at all — verify this binding actually works in your target browsers.`,
          );
        }
      }

      const entry = new Classes.KeybindEntry({
        keyCombination: parsedCombination,
        callback,
        eventType: type,
        preventRepeat,
        allowInInputElements: options.allowInInputElements,
        description: options.description,
        scope,
      });

      entriesForCombination.set(scope, entry);
      bindingsForType.set(parsedCombination, entriesForCombination);
      return entry;
    });
  };

  /**
   * Removes a keyboard event binding for a specific key combination, event
   * type, and scope.
   *
   * @param {Types.KeyCombination | Types.KeyCombinationConstruct} keyCombination - The key combination to unbind.
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to unbind (optional, default is 'keypress').
   * @param {string} [scope=undefined] - Remove the binding registered for this specific scope, rather than the unscoped (global) one.
   * @returns {boolean} Whether a binding was found and removed.
   * @throws {Classes.KeybindError} When an invalid EventType is provided.
   */
  remove = (
    keyCombination: Types.KeyCombination | Types.KeyCombinationConstruct,
    type: Types.EventType = "keypress",
    scope?: string,
  ): boolean => {
    if (!["keypress", "keydown", "keyup"].includes(type)) {
      throw new Classes.KeybindError("Wrong EventType.");
    }

    const { [type]: bindingsForType } = this.#bindings;
    const parsedCombination = helpers.keyParser(
      keyCombination,
      this.#keyMode,
      type === "keyup",
    );
    const entriesForCombination = bindingsForType.get(parsedCombination);
    const removed = entriesForCombination?.delete(scope) ?? false;

    // Don't leave an empty Map behind once its last scope is removed.
    if (removed && entriesForCombination?.size === 0) {
      bindingsForType.delete(parsedCombination);
    }

    return removed;
  };

  /**
   * Removes all keyboard event bindings.
   */
  removeAll = (): void => {
    Object.values(this.#bindings).forEach((map) => {
      map.clear();
    });
  };

  /**
   * Activates one or more scopes. A scoped binding (see `.add()`'s `scope`
   * option) only fires while its scope is active — bindings with no scope
   * at all are unaffected and always fire.
   *
   * @param {string | string[]} scope - The scope(s) to activate, in addition to whatever was already active.
   */
  enableScope = (scope: string | string[]): void => {
    for (const s of Array.isArray(scope) ? scope : [scope]) {
      this.#activeScopes.add(s);
    }
  };

  /**
   * Deactivates one or more scopes — the inverse of `enableScope()`.
   *
   * @param {string | string[]} scope - The scope(s) to deactivate.
   */
  disableScope = (scope: string | string[]): void => {
    for (const s of Array.isArray(scope) ? scope : [scope]) {
      this.#activeScopes.delete(s);
    }
  };

  /**
   * Replaces the entire set of active scopes at once — e.g. to temporarily
   * restrict to just one scope (opening a modal) and later restore
   * whatever was active before (closing it), without manually diffing via
   * `enableScope`/`disableScope`.
   *
   * @param {string[]} scopes - The scopes that should be active, replacing whatever was active before.
   */
  setActiveScopes = (scopes: string[]): void => {
    this.#activeScopes = new Set(scopes);
  };

  /**
   * @returns {string[]} The scopes currently active, in no particular order.
   */
  getActiveScopes = (): string[] => [...this.#activeScopes];

  /**
   * Starts listening for keyboard events on the target element.
   */
  startListeners = (): void => {
    Object.keys(this.#bindings).forEach((key) => {
      this.#target.addEventListener(key, this.#listener);
    });
  };

  /**
   * @deprecated
   * Starts listening for keyboard events on the target element.
   */
  startListners = this.startListeners;

  /**
   * Stops listening for keyboard events on the target element.
   */
  stopListeners = (): void => {
    Object.keys(this.#bindings).forEach((key) => {
      this.#target.removeEventListener(key, this.#listener);
    });
  };

  /**
   * @deprecated
   * Stops listening for keyboard events on the target element.
   */
  stopListners = this.stopListeners;

  /**
   * Stops listening for keyboard events and clears every binding. Use this
   * to fully tear down an instance, e.g. in a component's cleanup/unmount.
   */
  destroy = (): void => {
    this.stopListeners();
    this.removeAll();
  };

  /**
   * @returns {EventTarget}.
   */
  getTarget = (): EventTarget => this.#target;
}

export default BindKeyboard;

export { BindKeyboard, Classes, helpers };
export { default as KeybindError } from "./classes/KeybindError";
export type * as Types from "./types";

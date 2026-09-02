import type * as Types from "./types";
import * as Classes from "./classes";
import * as helpers from "./helpers";
import isBoolean from "lodash/isBoolean";

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
  readonly #bindings: Record<
    Types.EventType,
    Map<Types.KeyCombination, Classes.KeybindEntry>
  >;

  readonly #checkInputElements: boolean;
  readonly #keyMode: Types.KeyMode;

  /**
   * Creates an instance of the Keybind class.
   *
   * @param {Types.ConstructorProps} [props={}] - Configuration options for the Keybind instance.
   * @param {EventTarget} [props.target=globalThis] - The target element for listening to keyboard events (optional, default is window).
   * @param {Types.DebugLevel} [props.debug=0] - The level of debugging output (0 - None, 1 - Only existing bindings, 2 - All key events) (optional, default is 0).
   * @param {boolean} [props.checkInputElements=false] - Whether to prevent intercepting key events when typing in input fields (optional, default is false).
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
    this.#checkInputElements = props.checkInputElements || false;
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
      } of props.initialBindings) {
        this.add(keyCombination, callback, preventRepeat, type, {
          allowInInputElements,
          override,
          description,
        });
      }
    }

    // No addEventListener means there's no real DOM to listen on yet (e.g.
    // this instance was constructed during server-side rendering). Register
    // the bindings above but skip autostart instead of throwing, so a
    // component can still call startListeners() once mounted on the client.
    const canListen = typeof this.#target.addEventListener === "function";
    const shouldAutostart = isBoolean(props.autostart) ? props.autostart : true;

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

  // TODO: add 'then' shortcuts, like 'g then o'
  // TODO: add 'or' shortcuts, like 'shift + g or o'
  /**
   * Handles keyboard event listener. Prevents intercepting key events when typing in input fields
   * and manages execution of callback functions based on key combination and event type.
   *
   * @param {Event} ev - The keyboard event.
   */
  readonly #listener = (ev: Event): void => {
    if (!(ev instanceof KeyboardEvent)) return;

    const keyCombination = helpers.getKeyCombination(ev, this.#keyMode);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- #listener is only ever registered for keydown/keypress/keyup (see startListeners/stopListeners below), so ev.type is always a Types.EventType.
    const eventType = ev.type as Types.EventType;
    const entry = this.#bindings[eventType].get(keyCombination);

    // Do not intercept key events when typing in input fields, unless this
    // specific binding opted in via { allowInInputElements: true }.
    const shouldSkipForInputElement =
      this.#checkInputElements &&
      !entry?.allowInInputElements &&
      helpers.isInputOrTextArea();

    if (shouldSkipForInputElement) return;

    if (ev.repeat && entry?.preventRepeat) return;

    if (this.#debug === 2 || (this.#debug === 1 && entry)) {
      logDebugEvent({ ev, keyCombination, callback: entry?.callback });
    }

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
   * Gets the binding for a specific key combination and event type.
   *
   * @param {Types.KeyCombination | Types.KeyCombinationConstruct} keyCombination - The key combination to look up.
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to search (optional, default is 'keypress').
   * @returns {Classes.KeybindEntry | undefined} The key binding entry or undefined if not found.
   */
  getKeybind = (
    keyCombination: Types.KeyCombination | Types.KeyCombinationConstruct,
    type: Types.EventType = "keypress",
  ): Classes.KeybindEntry | undefined =>
    this.#bindings[type].get(helpers.keyParser(keyCombination, this.#keyMode));

  /**
   * Gets an array of all key bindings across all event types.
   *
   * @returns {Classes.KeybindEntry[]} An array of all key bindings.
   */
  getAllBindings = (): Classes.KeybindEntry[] => [
    ...this.#bindings.keydown.values(),
    ...this.#bindings.keypress.values(),
    ...this.#bindings.keyup.values(),
  ];

  /**
   * Adds one or more keyboard event bindings for the given key combination(s).
   *
   * @param {Types.KeyCombination | Types.KeyCombinationConstruct | Array<Types.KeyCombination | Types.KeyCombinationConstruct>} keyCombination - The key combination(s) to bind.
   * @param {Types.KeybindCallback} callback - The callback function to execute when the key combination is pressed.
   * @param {boolean} [preventRepeat=true] - Whether to prevent repeated key press events when holding down the key (optional, default is true).
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to bind (optional, default is 'keypress').
   * @param {Types.AddBindingOptions} [options={}] - Extra, optional behavior for this binding (allowInInputElements, override, description).
   * @returns {Classes.KeybindEntry[]} The binding entries that were created, one per key combination.
   * @throws {Classes.KeybindError} When an invalid EventType is provided, or when a binding already exists and `options.override` is `false`.
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

    return combinations.map((combination) => {
      const parsedCombination = helpers.keyParser(combination, this.#keyMode);
      const hasExistingBinding = bindingsForType.has(parsedCombination);

      if (options.override === false && hasExistingBinding) {
        throw new Classes.KeybindError(
          `A binding for "${parsedCombination}" (${type}) already exists. Pass { override: true } (the default) to replace it.`,
        );
      }

      if (this.#debug && hasExistingBinding) {
        // eslint-disable-next-line no-console -- surfaces a real footgun (silently replacing a binding) only when the consumer opted into `debug`.
        console.warn(
          `[bind-keyboard] Overwriting existing binding for "${parsedCombination}" (${type}).`,
        );
      }

      const entry = new Classes.KeybindEntry({
        keyCombination: parsedCombination,
        callback,
        eventType: type,
        preventRepeat,
        allowInInputElements: options.allowInInputElements,
        description: options.description,
      });

      bindingsForType.set(parsedCombination, entry);
      return entry;
    });
  };

  /**
   * Removes a keyboard event binding for a specific key combination.
   *
   * @param {Types.KeyCombination | Types.KeyCombinationConstruct} keyCombination - The key combination to unbind.
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to unbind (optional, default is 'keypress').
   * @throws {Classes.KeybindError} When an invalid EventType is provided.
   */
  remove = (
    keyCombination: Types.KeyCombination | Types.KeyCombinationConstruct,
    type: Types.EventType = "keypress",
  ): boolean | undefined => {
    if (!["keypress", "keydown", "keyup"].includes(type)) {
      throw new Classes.KeybindError("Wrong EventType.");
    }
    return this.#bindings[type].delete(
      helpers.keyParser(keyCombination, this.#keyMode),
    );
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

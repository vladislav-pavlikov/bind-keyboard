import type * as Types from "./types";
import * as Classes from "./classes";
import * as helpers from "./helpers";
import { isBoolean } from "lodash";

/**
 * Manages keyboard event bindings and execution of callback functions for specific key combinations.
 */
class BindKeyboard {
  #target: EventTarget;
  #debug: Types.DebugLevel;
  #bindings: Record<
    Types.EventType,
    Map<Types.KeyСombination, Classes.KeybindEntry>
  >;

  #checkInputElements: boolean;

  /**
   * Creates an instance of the Keybind class.
   *
   * @param {Types.ConstructorProps} [props={}] - Configuration options for the Keybind instance.
   * @param {EventTarget} [props.target=globalThis] - The target element for listening to keyboard events (optional, default is window).
   * @param {Types.DebugLevel} [props.debug=0] - The level of debugging output (0 - None, 1 - Only exsisting bindings, 2 - All key events) (optional, default is 0).
   * @param {boolean} [props.checkInputElements=false] - Whether to prevent intercepting key events when typing in input fields (optional, default is false).
   * @param {boolean} [props.autostart=true] - Whether to prevent intercepting key events when typing in input fields (optional, default is false).
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
    this.#checkInputElements = props?.checkInputElements || false;

    if (props?.initialBindings) {
      for (const {
        keyCombination,
        callback,
        preventRepeat = true,
        type = "keypress",
      } of props.initialBindings) {
        this.add(keyCombination, callback, preventRepeat, type);
      }
    }

    if (isBoolean(props.autostart) ? props.autostart : true) {
      this.startListners();
    }
  }

  /**
   * Handles debugging output.
   *
   * @param {Object} param - Debug information.
   * @param {Event} param.ev - The keyboard event.
   * @param {Types.KeyСombination} param.keyCombination - The key combination.
   * @param {EventListener} [param.callback=undefined] - The associated callback function (optional, default is undefined)..
   */
  #debugLog = ({
    ev,
    keyCombination,
    callback,
  }: {
    ev: Event;
    keyCombination: Types.KeyСombination;
    callback?: EventListener;
  }): void => {
    if (this.#debug === 2) {
      console.log(
        `%c${ev.type} %c${keyCombination} %c${callback || ""}`,
        "color: red",
        "",
        "color: green",
      );
    }
    if (this.#debug === 1 && callback) {
      console.log(
        `%c${ev.type} %c${keyCombination} %c${callback}`,
        "color: red",
        "",
        "color: green",
      );
    }
  };

  // TODO: add 'then' shortcuts, like 'g then o'
  // TODO: add 'or' shortcuts, like 'shift + g or o'
  /**
   * Handles keyboard event listener. Prevents intercepting key events when typing in input fields
   * and manages execution of callback functions based on key combination and event type.
   *
   * @param {Event} ev - The keyboard event.
   */
  #listener = (ev: Event): void => {
    // Do not intercept key events when typing in input fields
    if (this.#checkInputElements && helpers.isInputOrTextArea()) {
      return;
    }

    const keyCombination = helpers.getKeyСombination(ev as KeyboardEvent);
    const entry =
      this.#bindings?.[ev.type as Types.EventType]?.get(keyCombination);

    if ((ev as KeyboardEvent).repeat && entry?.preventRepeat) {
      return;
    }

    if (this.#debug)
      this.#debugLog({ ev, keyCombination, callback: entry?.callback });

    entry?.callback?.(ev);
  };

  /**
   * @extends keyParser
   */
  static keyParser = helpers.keyParser;

  /**
   * @extends helpers.getKeyСombination
   */
  static getKeyСombination = helpers.getKeyСombination;

  /**
   * Gets the binding for a specific key combination and event type.
   *
   * @param {Types.KeyСombination | Types.KeyСombinationConstruct} keyCombination - The key combination to look up.
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to search (optional, default is 'keypress').
   * @returns {Classes.KeybindEntry | undefined} The key binding entry or undefined if not found.
   */
  getKeybind = (
    keyCombination: Types.KeyСombination | Types.KeyСombinationConstruct,
    type: Types.EventType = "keypress",
  ): Classes.KeybindEntry | undefined =>
    this.#bindings?.[type].get(helpers.keyParser(keyCombination));

  /**
   * Gets an array of all key bindings across all event types.
   *
   * @returns {Classes.KeybindEntry[]} An array of all key bindings.
   */
  getAllBindings = (): Classes.KeybindEntry[] =>
    [
      ...this.#bindings.keydown,
      ...this.#bindings.keypress,
      ...this.#bindings.keyup,
    ].map((el) => el[1]);

  /**
   * Adds a keyboard event binding for a specific key combination.
   *
   * @param {Types.KeyСombination | Types.KeyСombinationConstruct} keyCombination - The key combination to bind.
   * @param {EventListener} callback - The callback function to execute when the key combination is pressed.
   * @param {boolean} [preventRepeat=true] - Whether to prevent repeated key press events when holding down the key (optional, default is true).
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to bind (optional, default is 'keypress').
   * @throws {Classes.KeybindError} When an invalid EventType is provided.
   */
  add = (
    keyCombination: Types.KeyСombination | Types.KeyСombinationConstruct,
    callback: EventListener,
    preventRepeat: boolean = true,
    type: Types.EventType = "keypress",
  ): Map<string, Classes.KeybindEntry> | undefined => {
    if (!["keypress", "keydown", "keyup"].includes(type)) {
      throw new Classes.KeybindError("Wrong EventType.");
    }

    const entry = new Classes.KeybindEntry(
      helpers.keyParser(keyCombination),
      callback,
      type,
      preventRepeat,
    );

    return this.#bindings?.[type].set(helpers.keyParser(keyCombination), entry);
  };

  /**
   * Removes a keyboard event binding for a specific key combination.
   *
   * @param {Types.KeyСombination | Types.KeyСombinationConstruct} keyCombination - The key combination to unbind.
   * @param {Types.EventType} [type='keypress'] - The type of keyboard event to unbind (optional, default is 'keypress').
   * @throws {Classes.KeybindError} When an invalid EventType is provided.
   */
  remove = (
    keyCombination: Types.KeyСombination | Types.KeyСombinationConstruct,
    type: Types.EventType = "keypress",
  ): boolean | undefined => {
    if (!["keypress", "keydown", "keyup"].includes(type)) {
      throw new Classes.KeybindError("Wrong EventType.");
    }
    return this.#bindings?.[type].delete(helpers.keyParser(keyCombination));
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
  startListners = (): void => {
    Object.keys(this.#bindings).forEach((key) => {
      this.#target.addEventListener(key, this.#listener);
    });
  };

  /**
   * Stops listening for keyboard events on the target element.
   */
  stopListners = (): void => {
    Object.keys(this.#bindings).forEach((key) => {
      this.#target.removeEventListener(key, this.#listener);
    });
  };

  /**
   * @returns {EventTarget}.
   */
  getTarget = (): EventTarget => this.#target;
}

export default new BindKeyboard();
export { BindKeyboard, Classes, helpers };

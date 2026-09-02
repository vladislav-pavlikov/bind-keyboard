export type EventType = "keydown" | "keypress" | "keyup";

export type DebugLevel = 0 | 1 | 2;

export type KeyMode = "key" | "code";

export type KeyCombination = string;

export type KeyCombinationConstruct = Partial<
  Pick<
    KeyboardEvent,
    "shiftKey" | "ctrlKey" | "altKey" | "metaKey" | "key" | "code"
  >
>;

export type KeybindCallback = (ev: KeyboardEvent) => void;

/**
 * Extra, optional behavior for a single binding, passed as the 5th argument to `add()`.
 */
export interface AddBindingOptions {
  /**
   * Let this binding fire even while an input, textarea, select, or
   * contenteditable element is focused, overriding the instance-level
   * `checkInputElements` setting for this one binding (default: false).
   */
  allowInInputElements?: boolean;
  /**
   * Whether adding this binding is allowed to replace an existing one for
   * the same key combination + event type. Defaults to `true` (matches
   * historical behavior). Pass `false` to throw a KeybindError instead of
   * silently overwriting.
   */
  override?: boolean;
  /**
   * Free-text label for this binding (e.g. for building a "keyboard
   * shortcuts" help screen from `getAllBindings()`). Not used internally.
   */
  description?: string;
  /**
   * Tags this binding with a named scope. A scoped binding only fires
   * while its scope is active (see `enableScope`/`setActiveScopes` on
   * `BindKeyboard`) — bindings with no scope at all always fire,
   * regardless of which scopes are active. The same key combination can
   * have a separate binding per scope, plus one more with no scope; when
   * more than one would otherwise match, whichever registered scope is
   * currently active takes priority over an unscoped binding for that
   * same combination.
   */
  scope?: string;
}

export interface KeybindInitializer extends AddBindingOptions {
  keyCombination: KeyCombination | KeyCombinationConstruct;
  callback: KeybindCallback;
  preventRepeat?: boolean;
  type?: EventType;
}

export interface ConstructorProps {
  target?: EventTarget | HTMLElement;
  debug?: DebugLevel;
  initialBindings?: KeybindInitializer[];
  /**
   * Whether bindings are skipped while an input, textarea, select, or
   * contenteditable element is focused. Defaults to `true` — pass `false`
   * to fire bindings even while typing. See `allowInInputElements` for a
   * per-binding override in the other direction.
   */
  checkInputElements?: boolean;
  autostart?: boolean;
  keyMode?: KeyMode;
}

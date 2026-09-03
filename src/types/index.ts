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
  /**
   * Only meaningful on a plain (non-sequence) binding. When this exact key
   * combination is also the first step of a registered sequence, delay
   * firing this binding for up to `sequenceTimeout` — if the user keeps
   * going and completes (or advances further into) that sequence, this
   * binding never fires at all; if they don't, it fires as normal once the
   * sequence attempt breaks or times out. Off by default (`false`): the
   * binding fires immediately, the same instant it always has, and the
   * sequence tracks independently in the background — so a plain binding
   * on `"g"` and a sequence on `"g,o"` can coexist, but pressing "g" fires
   * the plain one right away even if you go on to type "g,o". Opt in only
   * where firing both would actually be wrong for that specific binding.
   *
   * Only guards this key's role as a sequence's *first* step — a same-key
   * sequence like `"g,g"` still fires this binding on the press that
   * completes it too, since that press isn't starting anything new from
   * this key's point of view. Registering a plain binding on a key that's
   * also a same-key sequence's own repeated step isn't something this
   * option covers.
   */
  deferForSequence?: boolean;
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
  /**
   * How long (in ms) a key sequence (e.g. `"g,o"`, see `.add()`) may wait
   * between presses before it's abandoned and has to start over from its
   * first step. Defaults to `1000`. Has no effect on plain, non-sequence
   * bindings.
   */
  sequenceTimeout?: number;
}

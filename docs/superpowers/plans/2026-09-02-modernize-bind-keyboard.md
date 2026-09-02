# Modernize bind-keyboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the two live bugs found during review (a hanging test suite and a 7x-oversized bundle), add the agreed functional improvements (SSR safety, contenteditable awareness, per-binding input-element override, conflict handling, typed callbacks, `destroy()`, multi-combo `add()`, binding descriptions), and modernize the toolchain (ESLint flat config + `eslint-config-love`, Vite 8, Husky 9, TypeScript 5.9, single `bun.lockb` lockfile) — all already validated end-to-end in a scratch copy of this repo.

**Architecture:** No new files beyond `eslint.config.js` (replaces `.eslintrc.cjs`) and `scripts/check-bundle-size.mjs` (replaces the vulnerable `bundlesize` package). Every other change is an edit to an existing file. Every task below has already been implemented and verified once (`tsc --noEmit`, `eslint`, `vite build`, the custom bundle-size check, and `bun test` all green, from a clean `bun install`) in a scratch copy — this plan reproduces those exact, working diffs in the real repo.

**Tech Stack:** TypeScript 5.9, Bun (runtime + test runner + package manager), Vite 8 + vite-plugin-dts 5, ESLint 9 (flat config) + eslint-config-love, Prettier 3, Husky 9, GitLab CI.

**Known, deliberate deviations from "upgrade everything to latest":**

- **ESLint stays on 9.39.5, not 10.** `eslint-config-love@155.0.0` (the official replacement for the now-deprecated `eslint-config-standard-with-typescript`) declares `peerDependencies.eslint: "^9.35.0"`. Installing ESLint 10 alongside it produces a hard `ERESOLVE` conflict (verified). ESLint 9 is EOL per eslint.org, but it's the newest version the recommended config actually supports.
- **TypeScript stays on 5.9.3, not 7.** `typescript-eslint@8.x` (love's dependency) declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"`. TypeScript 7 would break the lint toolchain outright.
- **`bundlesize` (the npm package) is dropped, not upgraded.** Its dependency chain (`bundlesize -> github-build -> axios`) carries ~20 high-severity CVEs (confirmed via `npm audit`). Task 8 replaces it with a ~30-line zero-dependency script that reads the same `package.json` "bundlesize" budget config.
- **`package-lock.json` is deleted, not updated.** The project's actual dev workflow (husky pre-commit, `bunfig.toml`) already runs on `bun.lockb`; keeping a second, separately-drifting npm lockfile around is what let CI silently diverge from local. Task 9 moves CI onto `bun install` too.

---

### Task 1: Fix the bundle-bloat bug (lodash import)

**Files:**

- Modify: `src/index.ts:4`

- [ ] **Step 1: Confirm the current bundle size**

Run: `npm run build`
Expected output includes a line like `dist/bind-keyboard.js  139.73 kB │ gzip: 36.30 kB` — far over the 6 kB budget declared in `package.json`'s `"bundlesize"` field.

- [ ] **Step 2: Fix the import**

In `src/index.ts`, change:

```ts
import { isBoolean } from "lodash";
```

to:

```ts
import isBoolean from "lodash/isBoolean";
```

(This matches the per-method import style every other file in `src/helpers` already uses — the whole-package import was the one place pulling in all of lodash instead of one function.)

- [ ] **Step 3: Verify the fix**

Run: `npm run build`
Expected: `dist/bind-keyboard.js` drops to ~18.8 kB (gzip ~5.9 kB), and `dist/bind-keyboard.umd.cjs` drops to ~11.2 kB (gzip ~4.5 kB) — both back under budget.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "fix: import lodash/isBoolean directly instead of the whole package

Cuts the published bundle from 139.73 kB to 18.82 kB (gzip: 36.30 kB -> 5.93 kB) — it was 7x over the bundlesize budget because \"lodash\" (unlike the per-method lodash/xxx imports already used elsewhere) doesn't tree-shake.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Rename the Cyrillic-named file

**Files:**

- Rename: `src/helpers/getKeyСombination.ts` -> `src/helpers/getKeyCombination.ts`
- Modify: `src/helpers/index.ts`, `src/helpers/keyParser.ts`

The "С" in the current filename is Cyrillic (U+0421), not Latin "C" — invisible in most editors, but it means the file can't be found by searching or typing its name in Latin script.

- [ ] **Step 1: Rename and fix imports**

```bash
git mv "src/helpers/getKeyСombination.ts" src/helpers/getKeyCombination.ts
```

In `src/helpers/index.ts`, change:

```ts
export { default as getKeyCombination } from "./getKeyСombination";
```

to:

```ts
export { default as getKeyCombination } from "./getKeyCombination";
```

In `src/helpers/keyParser.ts`, change:

```ts
import getKeyCombination from "./getKeyСombination";
```

to:

```ts
import getKeyCombination from "./getKeyCombination";
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix: rename getKeyСombination.ts (Cyrillic С) to getKeyCombination.ts

The filename used U+0421 (Cyrillic С) instead of U+0043 (Latin C) — invisible in most editors, unfindable by search/autocomplete typed in Latin script.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Untrack `.env`

**Files:**

- Modify: `.gitignore`
- Remove from git tracking: `.env`

- [ ] **Step 1: Add `.env` and `coverage` to .gitignore**

In `.gitignore`, change:

```
node_modules
dist
dist-ssr
*.local
```

to:

```
node_modules
dist
dist-ssr
*.local
.env
coverage
```

- [ ] **Step 2: Untrack `.env` (keep the local file)**

```bash
git rm --cached .env
```

- [ ] **Step 3: Verify**

Run: `git status`
Expected: `.env` no longer appears as tracked; `.gitignore` shows as modified.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "fix: stop tracking .env, add it (and coverage/) to .gitignore

.env held an empty NPM_TOKEN placeholder, but being tracked meant a real token pasted in later would land in git history. Publishing already reads NPM_TOKEN from the environment via .npmrc — CI should set it as a masked variable, not via a committed file.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Note for whoever runs this: `.env` stays on disk (only untracked), so nothing local breaks. If the placeholder token in it was ever replaced with a real value at any point in this repo's history, treat that token as compromised and rotate it — deleting the file from history (`git filter-repo` or BFG) is a separate, disruptive operation or its owner to decide on, not something this task does automatically.

---

### Task 4: Types + `KeybindEntry` — support the new binding options

**Files:**

- Modify: `src/types/index.ts`
- Modify: `src/classes/KeybindEntry.ts`

- [ ] **Step 1: Replace `src/types/index.ts`**

```ts
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
  checkInputElements?: boolean;
  autostart?: boolean;
  keyMode?: KeyMode;
}
```

- [ ] **Step 2: Replace `src/classes/KeybindEntry.ts`**

```ts
import type { EventType, KeyCombination, KeybindCallback } from "../types";

interface KeybindEntryProps {
  keyCombination: KeyCombination;
  callback: KeybindCallback;
  eventType: EventType;
  preventRepeat: boolean;
  allowInInputElements?: boolean;
  description?: string;
}

class KeybindEntry {
  public readonly keyCombination: KeyCombination;
  public readonly callback: KeybindCallback;
  public readonly eventType: EventType;
  public readonly preventRepeat: boolean;
  public readonly allowInInputElements: boolean;
  public readonly description?: string;

  constructor({
    keyCombination,
    callback,
    eventType,
    preventRepeat,
    allowInInputElements,
    description,
  }: KeybindEntryProps) {
    this.keyCombination = keyCombination;
    this.callback = callback;
    this.eventType = eventType;
    this.preventRepeat = preventRepeat;
    this.allowInInputElements = allowInInputElements ?? false;
    this.description = description;
  }
}

export default KeybindEntry;
```

(The constructor moved from 6 positional parameters to one options object — `eslint-config-love`'s `max-params` rule caps at 4, and 6 positional booleans/strings was already hard to call correctly. `KeybindEntry` is only ever constructed internally, from `BindKeyboard#add`, so this isn't a public breaking change in practice — Task 6 updates that one call site.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors in `src/index.ts` (it still uses the old `KeybindEntry`/`EventListener` shapes) — that's expected, Task 6 fixes it. Confirm the errors are only in `src/index.ts` and `src/index.test.ts`, not in the two files just changed.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/classes/KeybindEntry.ts
git commit -m "feat: add AddBindingOptions (allowInInputElements/override/description) and typed KeybindCallback

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: `isInputOrTextArea` — recognize contenteditable and `<select>`

**Files:**

- Modify: `src/helpers/isInputOrTextArea.ts`

- [ ] **Step 1: Replace the file**

```ts
/**
 * Checks whether the currently focused element is a text-entry surface:
 * an input, textarea, select, or any contenteditable element (rich-text
 * editors, chat boxes, etc).
 *
 * @returns {boolean} True if the active element accepts text input, otherwise false.
 */
const isInputOrTextArea = (): boolean => {
  const { activeElement } = document;

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  );
};

export default isInputOrTextArea;
```

Function name is kept as-is (it's re-exported as `helpers.isInputOrTextArea`, part of the public `helpers` namespace) — only its behavior is broadened, which is backward compatible: it now returns `true` in strictly more cases than before.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: same pre-existing errors as after Task 4 (in `src/index.ts`/`src/index.test.ts` only) — none in this file.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/isInputOrTextArea.ts
git commit -m "fix: recognize contenteditable and <select> as text-entry elements

checkInputElements only skipped bindings for <input>/<textarea>. Any contenteditable surface (rich-text editors, chat boxes) or open <select> would still have its keystrokes intercepted.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `BindKeyboard` — SSR guard, per-binding input override, conflict handling, `destroy()`, multi-combo `add()`

**Files:**

- Modify: `src/index.ts`

- [ ] **Step 1: Replace the entire file**

```ts
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
    // component can still call startListners() once mounted on the client.
    const canListen = typeof this.#target.addEventListener === "function";

    if (!canListen) {
      // eslint-disable-next-line no-console -- this is the only signal a consumer gets that autostart was skipped; failing silently would be worse.
      console.warn(
        "[bind-keyboard] The target has no addEventListener (likely a non-browser environment, e.g. server-side rendering). Skipped autostart — call startListners() manually once a DOM is available.",
      );
    }

    if (canListen && (isBoolean(props.autostart) ? props.autostart : true)) {
      this.startListners();
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- #listener is only ever registered for keydown/keypress/keyup (see startListners/stopListeners below), so ev.type is always a Types.EventType.
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
  startListners = (): void => {
    Object.keys(this.#bindings).forEach((key) => {
      this.#target.addEventListener(key, this.#listener);
    });
  };

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
   * Starts listening for keyboard events on the target element.
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
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors now only in `src/index.test.ts` (still using the old `add()`/`getKeybind()` shape assumptions) — Task 7 fixes that.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: SSR-safe autostart, per-binding allowInInputElements, override/conflict handling, destroy(), multi-combo add()

- Constructor no longer throws when target has no addEventListener (e.g. constructed during SSR) — it warns and skips autostart instead, so startListners() can be called manually once mounted.
- add() accepts an array of key combinations to bind the same callback to several shortcuts at once, and a 5th options argument: allowInInputElements (per-binding override of checkInputElements), override (throw instead of silently replacing an existing binding), description (free-text label for building a shortcuts help screen from getAllBindings()).
- New destroy() combines stopListeners() + removeAll() for component cleanup/unmount.
- Callback type is now (ev: KeyboardEvent) => void instead of the generic EventListener, so consumers get real autocomplete (ev.key, ev.ctrlKey, ...) without casting.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Update and extend the test suite

**Files:**

- Modify: `src/index.test.ts`

- [ ] **Step 1: Replace the entire file**

```ts
// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- bun-types/test-globals has no runtime exports, so it can only be pulled in as an ambient type reference, not an import.
/// <reference types="bun-types/test-globals" />
import BindKeyboard from "./";
import { KeybindError } from "./classes";

const bindKeyboard = new BindKeyboard();

describe("Keybind Library Tests", () => {
  beforeEach(() => {
    bindKeyboard.removeAll();
  });

  it("window is defined", () => {
    expect(window).toBeDefined();
  });

  it("should add key binding and find it by .getKeybind", () => {
    const callback = jest.fn();
    bindKeyboard.add("ctrl+A", callback);

    expect(bindKeyboard.getKeybind("Ctrl+A")).toEqual({
      keyCombination: "ctrl + a",
      callback,
      eventType: "keypress",
      preventRepeat: true,
      allowInInputElements: false,
    });
  });

  it('should not find deleted "Ctrl+A" binding by .getKeybind', () => {
    expect(bindKeyboard.getKeybind("Ctrl+A")).not.toBeDefined();
  });

  it("should add and trigger key binding", () => {
    const callback = jest.fn();
    bindKeyboard.add("ctrl+a", callback);

    const event = new KeyboardEvent("keypress", { key: "a", ctrlKey: true });
    dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
  });

  it("should rewrite key binding on same keyCombination by default", () => {
    const callbackNotToHaveBeenCalled = jest.fn();
    const callbackToHaveBeenCalled = jest.fn();
    bindKeyboard.add("ctrl+a", callbackNotToHaveBeenCalled);
    bindKeyboard.add("ctrl+a", callbackToHaveBeenCalled);

    const event = new KeyboardEvent("keypress", { key: "a", ctrlKey: true });
    dispatchEvent(event);

    expect(callbackNotToHaveBeenCalled).not.toHaveBeenCalled();
    expect(callbackToHaveBeenCalled).toHaveBeenCalled();
  });

  it("should throw when re-adding an existing combination with override: false", () => {
    bindKeyboard.add("ctrl+a", jest.fn());

    expect(() =>
      bindKeyboard.add("ctrl+a", jest.fn(), true, "keypress", {
        override: false,
      }),
    ).toThrow(KeybindError);
  });

  it("should not trigger key binding when key combination does not match", () => {
    const callback = jest.fn();
    bindKeyboard.add({ key: "a", ctrlKey: true }, callback, true, "keydown");

    const event = new KeyboardEvent("keydown", { key: "a" });
    dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("should remove key binding", () => {
    const callback = jest.fn();
    bindKeyboard.add("ctrl+A", callback);
    bindKeyboard.remove("ctrl+A");

    const event = new KeyboardEvent("keypress", { key: "a", ctrlKey: true });
    document.dispatchEvent(event);

    expect(bindKeyboard.getKeybind("ctrl+A")).not.toBeDefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it("should match by code when keyMode is code", () => {
    const bindKeyboardCode = new BindKeyboard({ keyMode: "code" });
    const callback = jest.fn();
    bindKeyboardCode.add("ctrl+a", callback, true, "keydown");

    const event = new KeyboardEvent("keydown", {
      key: "ф",
      code: "KeyA",
      ctrlKey: true,
    });
    dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
    bindKeyboardCode.stopListeners();
  });

  it("should bind the same callback to an array of key combinations", () => {
    const callback = jest.fn();
    const entries = bindKeyboard.add(["ctrl+a", "ctrl+b"], callback);

    expect(entries).toHaveLength(2);

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    dispatchEvent(new KeyboardEvent("keypress", { key: "b", ctrlKey: true }));

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should store an optional description on the binding entry", () => {
    bindKeyboard.add("ctrl+a", jest.fn(), true, "keypress", {
      description: "Select all",
    });

    expect(bindKeyboard.getKeybind("ctrl+a")?.description).toBe("Select all");
  });

  it("should stop listening and clear bindings on .destroy()", () => {
    const callback = jest.fn();
    const destroyable = new BindKeyboard();
    destroyable.add("ctrl+a", callback);

    destroyable.destroy();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));

    expect(callback).not.toHaveBeenCalled();
    expect(destroyable.getAllBindings()).toHaveLength(0);
  });

  it("should not intercept keys while a contenteditable element is focused", () => {
    const guarded = new BindKeyboard({ checkInputElements: true });
    const callback = jest.fn();
    guarded.add("ctrl+a", callback);

    const editableDiv = document.createElement("div");
    editableDiv.contentEditable = "true";
    document.body.appendChild(editableDiv);
    editableDiv.focus();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(callback).not.toHaveBeenCalled();

    editableDiv.remove();
    guarded.destroy();
  });

  it("should still trigger a binding marked allowInInputElements while an input is focused", () => {
    const guarded = new BindKeyboard({ checkInputElements: true });
    const callback = jest.fn();
    guarded.add("escape", callback, true, "keydown", {
      allowInInputElements: true,
    });

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(callback).toHaveBeenCalled();

    input.remove();
    guarded.destroy();
  });

  it("should skip autostart instead of throwing when the target cannot listen", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally silences console.warn noise for this test.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deliberately building a target that lacks addEventListener, to exercise the SSR guard.
    const fakeTarget = {} as unknown as EventTarget;

    expect(() => new BindKeyboard({ target: fakeTarget })).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
```

This adds the ambient `bun-types/test-globals` reference (needed from Task 10 onward — newer `bun-types` stopped auto-declaring `describe`/`it`/`expect`/`jest` as globals, see that task's note), adds `allowInInputElements: false` to the existing `toEqual` assertion (the entry shape gained a field), and adds one test per new behavior: override conflict, multi-combo `add()`, `description`, `destroy()`, contenteditable, `allowInInputElements`, and the SSR guard.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

Run: `bun test`
Expected: `15 pass`, `0 fail`.

- [ ] **Step 3: Commit**

```bash
git add src/index.test.ts
git commit -m "test: cover override conflicts, multi-combo add(), description, destroy(), contenteditable, allowInInputElements, SSR guard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Replace `bundlesize` (vulnerable dependency) with a small local script

**Files:**

- Create: `scripts/check-bundle-size.mjs`
- Modify: `package.json`

`npm audit` on the modernized dependency set (Task 9) reports 3 high-severity vulnerabilities, all from `bundlesize -> github-build -> axios` (a long list of SSRF/prototype-pollution/DoS advisories on old pinned `axios`). This task removes that dependency and its already-broken script (it wasn't even installed before — `npm run bundlesize` would have failed outright) and replaces it with a same-behavior local script.

- [ ] **Step 1: Create the script**

```js
// Zero-dependency replacement for the `bundlesize` package (dropped because
// its `github-build` -> `axios` transitive chain carries known high-severity
// CVEs). Reads the same `"bundlesize"` budget array from package.json and
// compares each file's gzip size against `maxSize`.
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

const parseMaxSize = (maxSize) => {
  const match = /^(\d+(?:\.\d+)?)\s*(kb|b)$/i.exec(maxSize.trim());
  if (!match) {
    throw new Error(`Cannot parse maxSize "${maxSize}"`);
  }
  const [, amount, unit] = match;
  return unit.toLowerCase() === "kb"
    ? parseFloat(amount) * 1024
    : parseFloat(amount);
};

let failed = false;

for (const { path: relativePath, maxSize } of pkg.bundlesize ?? []) {
  const filePath = path.join(rootDir, relativePath);
  const fileBuffer = readFileSync(filePath);
  const gzipSize = gzipSync(fileBuffer).length;
  const maxBytes = parseMaxSize(maxSize);
  const withinBudget = gzipSize <= maxBytes;

  if (!withinBudget) failed = true;

  console.log(
    `${withinBudget ? "✓" : "✗"} ${relativePath}: ${(gzipSize / 1024).toFixed(2)} kB gzip (budget: ${maxSize})`,
  );
}

if (failed) {
  console.error("\nBundle size budget exceeded.");
  process.exit(1);
}
```

- [ ] **Step 2: Point the npm script at it**

In `package.json`, change the `"bundlesize"` script from:

```json
"bundlesize": "npm run build && bundlesize"
```

to:

```json
"bundlesize": "npm run build && node scripts/check-bundle-size.mjs"
```

(The `"bundlesize"` config array below the `scripts` block — the `maxSize` budgets — stays exactly as-is; the script reads it directly.)

- [ ] **Step 3: Verify**

Run: `npm run bundlesize`
Expected: two `✓` lines, e.g. `✓ ./dist/bind-keyboard.js: 4.73 kB gzip (budget: 6 kB)`.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-bundle-size.mjs package.json
git commit -m "fix: replace bundlesize package with a zero-dependency script

bundlesize's github-build -> axios dependency chain carries ~20 high-severity CVEs per npm audit, and the script was already broken (bundlesize wasn't in devDependencies at all). This ~30-line script reads the same package.json \"bundlesize\" budgets with only node:zlib and node:fs.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Dependency modernization — package.json, ESLint flat config, Husky 9, Vite config, single lockfile

This is the biggest single task because the pieces are interdependent (you can't bump ESLint without also switching to flat config; you can't drop `package-lock.json` without also fixing the CI install step, which Task 11 does). Steps are still independently checkable.

**Files:**

- Modify: `package.json`
- Create: `eslint.config.js`
- Delete: `.eslintrc.cjs`, `.eslintignore`, `package-lock.json`
- Modify: `.husky/pre-commit`
- Delete: `.husky/_/` (directory)
- Modify: `vite.config.ts`

- [ ] **Step 1: Update `package.json`**

Replace the `"devDependencies"` block with:

```json
"devDependencies": {
    "@happy-dom/global-registrator": "^20.13.0",
    "@types/lodash": "^4.17.25",
    "@types/node": "^20.19.43",
    "bun-types": "^1.4.0",
    "eslint": "^9.39.5",
    "eslint-config-love": "^155.0.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-import": "^2.32.0",
    "eslint-plugin-n": "^18.3.0",
    "eslint-plugin-prettier": "^5.5.6",
    "eslint-plugin-promise": "^7.3.0",
    "globals": "^16.4.0",
    "husky": "^9.1.7",
    "lint-staged": "^15.5.2",
    "lodash": "^4.18.1",
    "pinst": "^3.0.0",
    "prettier": "^3.9.6",
    "typescript": "^5.9.3",
    "vite": "^8.2.2",
    "vite-plugin-dts": "^5.1.0"
  },
```

This drops `@typescript-eslint/eslint-plugin` (superseded by `eslint-config-love`'s own `typescript-eslint` dependency), `eslint-config-standard-with-typescript` (deprecated upstream — "Please use eslint-config-love, instead"), `@types/jest` and `jest-environment-jsdom` (unused: `bun test` runs on `happy-dom` per `bunfig.toml`, never jsdom, and `tsconfig.json`'s `"types": ["bun-types"]` means `@types/jest` was never even loaded — confirmed by a clean `tsc --noEmit` without it), and `bundlesize` (Task 8).

Replace the `"scripts"` block with:

```json
"scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "bun test",
    "lint": "eslint 'src/**/*.{js,ts,jsx,tsx}' --quiet --fix",
    "prepare": "husky",
    "prepack": "pinst --disable",
    "postpack": "pinst --enable",
    "prepublishOnly": "npm run build",
    "bundlesize": "npm run build && node scripts/check-bundle-size.mjs"
  },
```

(`"postinstall": "husky install"` -> `"prepare": "husky"`: Husky 9's setup command changed, **and** `postinstall` runs for anyone who installs this package as a _dependency_ too — `prepare` doesn't, so this also fixes an existing footgun where installing `bind-keyboard` from npm would have tried to run `husky install` in the consumer's `node_modules`.)

Also add (after `"types"`, before `"files"`):

```json
"exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/bind-keyboard.js",
      "require": "./dist/bind-keyboard.umd.cjs"
    }
  },
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  },
```

(The `engines` range matches Vite 8's own `engines.node` requirement — verified installed Node v22.14.0 satisfies it.)

- [ ] **Step 2: Delete the old ESLint config files**

```bash
git rm .eslintrc.cjs .eslintignore
```

- [ ] **Step 3: Create `eslint.config.js`**

```js
import love from "eslint-config-love";
import prettierConfig from "eslint-config-prettier";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  {
    ...love,
    files: ["src/**/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      ...love.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      ...love.rules,
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // Function-size limits fit lower-level code, not this file's cohesive
      // constructor/handler methods — raise the ceiling instead of splitting
      // methods purely to satisfy the linter.
      complexity: ["error", 16],
      // Small literal counts (debug levels 0-2, keydown/keypress/keyup, etc.)
      // read fine inline in a library this size.
      "@typescript-eslint/no-magic-numbers": "off",
      // BindKeyboard#add takes (keyCombination, callback, preventRepeat,
      // type, options) — dropping to 4 would mean breaking the established
      // positional call signature just to satisfy the linter.
      "@typescript-eslint/max-params": ["error", { max: 5 }],
      // The project targets ES2020 (see tsconfig.json); the 'v' flag needs
      // ES2024+, so require the 'u' flag instead.
      "require-unicode-regexp": ["error", { requireFlag: "u" }],
    },
  },
  {
    // bun:test's fluent matcher API (`expect(...).toHaveBeenCalled()`,
    // `jest.fn()`) isn't resolvable by typescript-eslint's type-aware
    // checker, so the unsafe-* family fires on every assertion here. This is
    // a known friction point with Bun's test types, not a real safety issue.
    files: ["src/**/*.test.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },
  prettierConfig,
  prettierRecommended,
];
```

The three `@typescript-eslint/*` rules turned off at the top mirror what `.eslintrc.cjs` already disabled — the rest of `eslint-config-love`'s ~262 rules are much stricter than `eslint-config-standard-with-typescript` (its own README: "Safety at the cost of verbosity... It is expected that most version bumps [and thus rule sets] would require disabling more rules"). The remaining overrides above (`complexity`, `no-magic-numbers`, `max-params`, `require-unicode-regexp`) were all found by actually running the new config against this codebase and are the minimum needed to reach zero errors without restructuring working code just to satisfy the linter.

- [ ] **Step 4: Migrate Husky to v9's format**

```bash
rm -rf .husky/_
```

Replace `.husky/pre-commit` with:

```sh
npx lint-staged --no-stash
bun test
```

(Husky 9 no longer needs the `. "$(dirname -- "$0")/_/husky.sh"` sourcing line or the `.husky/_/` directory. Also drops the old `git add` line, which ran with no arguments/flags and — in any git version this project would run under — stages nothing; `lint-staged` already re-stages the fixes it applies on its own.)

- [ ] **Step 5: Fix the Vite 8 config deprecation warning**

In `vite.config.ts`, change:

```ts
entry: resolve(__dirname, 'src/index.ts'),
```

to:

```ts
entry: resolve(import.meta.dirname, 'src/index.ts'),
```

(`package.json` has `"type": "module"`, so `vite.config.ts` runs as ESM, where bare `__dirname` isn't defined — Vite currently shims it but warns: _"Your Vite config uses features that are unsupported by `configLoader: 'native'`... Use `import.meta.dirname` instead."_ `import.meta.dirname` needs Node >= 20.11, already covered by the `engines` field from Step 1.)

- [ ] **Step 6: Drop the npm lockfile**

```bash
git rm package-lock.json
```

(Task 11 switches CI to `bun install`, so `bun.lockb` becomes the single source of truth — see the plan header's "Known, deliberate deviations" note on why.)

- [ ] **Step 7: Clean install and verify everything together**

```bash
rm -rf node_modules
bun install
```

Expected: install succeeds, `bun.lockb` is rewritten.

Run: `npm run lint`
Expected: no errors printed (only the npm script header lines).

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output.

Run: `npm run build`
Expected: build succeeds; `dist/bind-keyboard.js` gzip ~4.9 kB, `dist/bind-keyboard.umd.cjs` gzip ~4.4 kB, no `__dirname` warning.

Run: `npm run bundlesize`
Expected: two `✓` lines.

Run: `bun test`
Expected: `15 pass`, `0 fail` (this is also the first real confirmation the happy-dom hang from the plan header is gone — with the old `@happy-dom/global-registrator@12.9.1`, this same command would spin at ~100% CPU forever and print nothing past the file header).

Run: `npm audit`
Expected: `found 0 vulnerabilities`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: modernize toolchain — ESLint 9 flat config + eslint-config-love, Vite 8, Husky 9, TS 5.9, single bun.lockb lockfile

- eslint-config-standard-with-typescript is deprecated upstream (\"Please use eslint-config-love, instead\") — migrated to eslint-config-love on ESLint 9's flat config (eslint.config.js replaces .eslintrc.cjs/.eslintignore). Stays on ESLint 9, not 10: eslint-config-love's peerDependencies pin eslint@^9.35.0, and installing 10 alongside it is a hard ERESOLVE conflict.
- Husky postinstall -> prepare (prepare doesn't run when this package is installed as a dependency; postinstall did), migrated .husky/pre-commit to v9's format, dropped the dead \"git add\" line.
- Removed @typescript-eslint/eslint-plugin (superseded by eslint-config-love's own typescript-eslint dep), @types/jest and jest-environment-jsdom (unused — bun test runs on happy-dom per bunfig.toml, never jsdom or jest).
- vite.config.ts: __dirname -> import.meta.dirname (fixes a Vite 8 deprecation warning under ESM configs).
- Dropped package-lock.json — bun.lockb was already the lockfile the dev workflow (husky, bunfig.toml) actually uses; CI now installs with bun too (next commit).
- @happy-dom/global-registrator 12.9.1 -> 20.13.0 fixes a real bug: GlobalRegistrator.register() hangs indefinitely (~100% CPU, no output) with this Bun version — bun test was completely broken before this bump.
- Stays on TypeScript 5.9, not 7: typescript-eslint (eslint-config-love's dependency) requires typescript <6.1.0.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Document why `src/index.test.ts` needs the `bun-types/test-globals` reference

**Files:** none (documentation-only note for whoever runs this plan; Task 7 already includes the actual code change)

Skip this task if Task 7 already ran after Task 9 — the ordering above lists Task 7 before Task 9 for readability, but the `bun-types/test-globals` reference in Task 7's file only matters once `bun-types` is bumped to `^1.4.0` in Task 9. **Recommended execution order: do Task 9 (or at least bump `bun-types`) before Task 7's verification step**, or re-run Task 7's Step 2 (`tsc`/`bun test`) again after Task 9 to confirm.

Context for the "why": newer `bun-types` stopped putting `describe`/`it`/`expect`/`jest`/etc. in the global scope by default — `node_modules/bun-types/test-globals.d.ts` now opens with `// Do not include this file in ./index.d.ts` and documents the opt-in mechanism as a triple-slash reference:

```ts
/// <reference types="bun-types/test-globals" />
```

A plain `import { describe, it } from "bun:test"` was tried first (it's the more "modern" style) but `tsc` reports `Cannot find module 'bun:test'` even though `bun-types/test.d.ts` does contain `declare module "bun:test" { ... }` — this is a real, reproducible quirk of this `bun-types` version's module resolution, not a config mistake (confirmed by testing both forms directly). The triple-slash form is what `bun-types` itself documents and is what actually works; `@typescript-eslint/triple-slash-reference` is silenced for that one line with a comment explaining why.

- [ ] Nothing to check off — informational only.

---

### Task 11: CI — add a test stage, install with Bun

**Files:**

- Modify: `.gitlab-ci.yml`

The only existing stage is a manual `publish` on `main` — nothing currently runs lint/typecheck/build/test on a push or merge request, so broken code (including the happy-dom hang from before Task 9) could merge unnoticed.

- [ ] **Step 1: Replace `.gitlab-ci.yml`**

```yaml
image: node:22

stages:
  - test
  - publish

# The project standardizes on Bun for installs and the test runner
# (bunfig.toml, bun.lockb) — `bun install` is what CONTRIBUTING and the
# pre-commit hook both use, so CI installs the same way instead of drifting
# from a separate package-lock.json.
before_script:
  - curl -fsSL https://bun.sh/install | bash
  - export PATH="$HOME/.bun/bin:$PATH"
  - bun install --frozen-lockfile

test:
  stage: test
  script:
    - npm run lint
    - npx tsc --noEmit
    - npm run build
    - npm run bundlesize
    - bun test

publish_npm:
  stage: publish
  when: manual
  script:
    - npm publish
  only:
    - main
```

(`image: node:latest` -> `node:22`: pins to a specific major instead of a floating tag that can silently change under CI, and matches the `engines.node` range from Task 9. `npm ci` is dropped from both stages since there's no `package-lock.json` anymore; `bun install --frozen-lockfile` is the equivalent reproducibility guarantee against `bun.lockb`. `npm publish` still works fine against a Bun-populated `node_modules` — publishing just reads `package.json`'s `files` field and `.npmrc`'s `NPM_TOKEN`, regardless of which tool did the install.)

- [ ] **Step 2: Verify**

Run: `cat .gitlab-ci.yml` and confirm it's valid YAML (e.g. `python3 -c "import yaml,sys; yaml.safe_load(open('.gitlab-ci.yml'))"` or any YAML linter available) — there's no local GitLab runner to execute the pipeline itself, so this step is a syntax check plus a manual read-through, not a full run.

- [ ] **Step 3: Commit**

```bash
git add .gitlab-ci.yml
git commit -m "ci: add a lint/typecheck/build/bundlesize/test stage, install with Bun

Previously the only stage was a manual npm publish on main — nothing ran on pushes or merge requests, so e.g. the happy-dom hang fixed earlier in this branch could have merged unnoticed. Also pins the image to node:22 instead of the floating node:latest tag.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: README — document the full public API

**Files:**

- Modify: `README.md`

The README only documented the constructor with no options and `.add()` with 2 arguments; `remove`, `getAllBindings`, `getKeybind`, `destroy`, `startListners`/`stopListeners`, `keyMode`, `debug`, `checkInputElements`, and the new `AddBindingOptions` were undocumented, and the "Examples" section linked to a repository root that has no `examples/` directory.

- [ ] **Step 1: Replace `README.md`**

````md
# bind-keyboard

[![npm](https://img.shields.io/npm/v/bind-keyboard.svg)](https://www.npmjs.com/package/bind-keyboard)
[![npm downloads](https://img.shields.io/npm/dm/bind-keyboard.svg)](https://www.npmjs.com/package/bind-keyboard)
[![npm](https://img.shields.io/bundlephobia/minzip/bind-keyboard)](https://bundlephobia.com/result?p=bind-keyboard)

![GitLab (self-managed)](https://img.shields.io/gitlab/license/bind-keyboard%2Fbind-keyboard?link=https%3A%2F%2Fgitlab.com%2Fbind-keyboard%2Fbind-keyboard%2F-%2Fblob%2Fmain%2FLICENSE)

`bind-keyboard` is a lightweight Typescript library for managing keyboard event bindings and executing callback functions for specific key combinations. It's designed to simplify handling keyboard events in your web applications.

## Features

- Easily bind callback functions to specific key combinations, including multiple combinations per callback.
- Supports preventing repeated key press events when holding down a key.
- Prevents intercepting key events when typing in input fields — with a per-binding override for shortcuts (e.g. `Escape`) that should still fire.
- Layout-agnostic matching via `event.code`, as an alternative to `event.key`.
- Debugging options for different levels of output.
- Safe to construct during server-side rendering — it skips autostart instead of throwing when there's no DOM yet.

## Installation

You can install the "bind-keyboard" library via npm:

```bash
npm install bind-keyboard
```

## Usage

To use "bind-keyboard," you need to create an instance of the **`BindKeyboard`** class. This instance can be used to add and manage keyboard event bindings. Here's a basic example:

```ts
import { BindKeyboard } from "bind-keyboard";

// Create a BindKeyboard instance
const bindKeyboard = new BindKeyboard();

// Add a key binding for ctrl+a
bindKeyboard.add("ctrl+a", (event) => {
  console.log("ctrl+a was pressed");
});
```

## Constructor options

```ts
new BindKeyboard({
  target: window, // EventTarget to listen on (default: globalThis)
  debug: 0, // 0 = off, 1 = log matched bindings, 2 = log every key event
  checkInputElements: false, // skip bindings while an input/textarea/select/contenteditable is focused
  autostart: true, // start listening immediately
  keyMode: "key", // "key" (event.key) or "code" (event.code, layout-agnostic)
  initialBindings: [], // KeybindInitializer[], added at construction time
});
```

| Option               | Type                   | Default      | Description                                                                          |
| -------------------- | ---------------------- | ------------ | ------------------------------------------------------------------------------------ |
| `target`             | `EventTarget`          | `globalThis` | Where keyboard events are listened for.                                              |
| `debug`              | `0 \| 1 \| 2`          | `0`          | `1` logs matched bindings, `2` logs every observed key event.                        |
| `checkInputElements` | `boolean`              | `false`      | When `true`, bindings are skipped while a text-entry element is focused (see below). |
| `autostart`          | `boolean`              | `true`       | Start listening as soon as the instance is constructed.                              |
| `keyMode`            | `"key" \| "code"`      | `"key"`      | `"code"` matches by physical key (`event.code`), independent of keyboard layout.     |
| `initialBindings`    | `KeybindInitializer[]` | `undefined`  | Bindings to register immediately, equivalent to calling `.add()` for each.           |

## API

### `.add(keyCombination, callback, preventRepeat = true, type = "keypress", options = {})`

Registers a binding. `keyCombination` is a string (`"ctrl+a"`), a construct object (`{ key: "a", ctrlKey: true }`), or an array of either to bind the same callback to several combinations at once. Returns the created `KeybindEntry[]` (one per combination).

```ts
bindKeyboard.add(["ctrl+a", "meta+a"], selectAll);

bindKeyboard.add("ctrl+z", undo, true, "keydown", {
  description: "Undo", // shown up in getAllBindings(), useful for a shortcuts help screen
  allowInInputElements: false, // default; set true to fire even while typing
  override: true, // default; pass false to throw instead of silently replacing an existing binding
});
```

### `.remove(keyCombination, type = "keypress")`

Removes a single binding. Returns `true` if a binding was found and removed.

### `.getKeybind(keyCombination, type = "keypress")`

Looks up a single binding, returning its `KeybindEntry` or `undefined`.

### `.getAllBindings()`

Returns every registered `KeybindEntry` across all event types — handy for building a "keyboard shortcuts" help screen from each entry's `description`.

### `.removeAll()`

Clears every binding without touching the underlying event listeners.

### `.startListners()` / `.stopListeners()`

Attach/detach the underlying event listeners on `target`, independent of the bindings themselves.

### `.destroy()`

Stops listening and clears every binding in one call — use it in a component's cleanup/unmount.

### `.getTarget()`

Returns the `EventTarget` this instance listens on.

## License

This project is licensed under the [MIT License](https://gitlab.com/bind-keyboard/bind-keyboard/-/blob/main/LICENSE).
````

- [ ] **Step 2: Verify formatting**

Run: `npx prettier --check README.md`
Expected: no warnings.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the full public API (remove, getAllBindings, getKeybind, destroy, keyMode, debug, checkInputElements, AddBindingOptions); drop the dead examples/ link

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Final end-to-end verification

**Files:** none — this task only runs commands.

- [ ] **Step 1: Full clean-room check**

```bash
rm -rf node_modules dist
bun install
npm run lint
npx tsc --noEmit -p tsconfig.json
npm run build
npm run bundlesize
bun test
npm audit
```

Expected, in order: clean install; no lint errors; no tsc output; a build with `dist/bind-keyboard.js` gzip ~4.9 kB and `dist/bind-keyboard.umd.cjs` gzip ~4.4 kB; two `✓` bundlesize lines; `15 pass, 0 fail` from `bun test` completing in well under a second (not hanging); `found 0 vulnerabilities`.

- [ ] **Step 2: Confirm `.env` is no longer tracked and the Cyrillic filename is gone**

```bash
git ls-files | grep -E '\.env$|getKey.ombination'
```

Expected: no output.

- [ ] **Step 3: Review the full diff once before deciding how to ship it**

```bash
git log --oneline -13
```

No further commit here — this task is verification only. Bump `package.json`'s `"version"` and decide on a changelog entry / release as a separate, deliberate step once this diff has been reviewed (`add()`'s return type changed from `Map<string, KeybindEntry> | undefined` to `KeybindEntry[]`, and `KeybindEntry`'s constructor changed from positional args to one options object — both are real, if narrow, breaking changes worth a minor version bump, not a patch).

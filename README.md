# bind-keyboard

[![npm](https://img.shields.io/npm/v/bind-keyboard.svg)](https://www.npmjs.com/package/bind-keyboard)
[![npm downloads](https://img.shields.io/npm/dm/bind-keyboard.svg)](https://www.npmjs.com/package/bind-keyboard)
[![npm](https://img.shields.io/bundlephobia/minzip/bind-keyboard)](https://bundlephobia.com/result?p=bind-keyboard)

![GitLab (self-managed)](https://img.shields.io/gitlab/license/bind-keyboard%2Fbind-keyboard?link=https%3A%2F%2Fgitlab.com%2Fbind-keyboard%2Fbind-keyboard%2F-%2Fblob%2Fmain%2FLICENSE)

`bind-keyboard` is a lightweight Typescript library for managing keyboard event bindings and executing callback functions for specific key combinations. It's designed to simplify handling keyboard events in your web applications.

**[Live demo →](https://bind-keyboard.gitlab.io/bind-keyboard/)** — an on-screen keyboard highlights pressed keys and the combination bind-keyboard detects, with toggles for `keyMode`/`checkInputElements`, a live shortcuts panel, and copy-pasteable code samples for Vanilla/React/Vue/Svelte in TS or JS.

## Features

- Easily bind callback functions to specific key combinations, including multiple combinations per callback.
- Supports preventing repeated key press events when holding down a key.
- Prevents intercepting key events when typing in input fields — with a per-binding override for shortcuts (e.g. `Escape`) that should still fire.
- Layout-agnostic matching via `event.code`, as an alternative to `event.key`.
- `"cmdOrCtrl"` — a platform-neutral modifier alias in string combinations, resolving to `metaKey` on Mac and `ctrlKey` everywhere else.
- Debugging options for different levels of output, including a heads-up when a binding commonly collides with a browser/OS shortcut (e.g. `ctrl+p` for Print).
- Safe to construct during server-side rendering — it skips autostart instead of throwing when there's no DOM yet.
- Scopes — tag a binding so it only fires while its scope is active, with the same key combination free to mean something else (or nothing) globally.

Not currently supported: key chords/sequences (e.g. a Vim-style "press `g` then `o`") or "or" alternates (e.g. "`shift+g` or `o`") — every binding is a single, simultaneous key combination.

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
  checkInputElements: true, // skip bindings while an input/textarea/select/contenteditable is focused
  autostart: true, // start listening immediately
  keyMode: "key", // "key" (event.key) or "code" (event.code, layout-agnostic)
  initialBindings: [], // KeybindInitializer[], added at construction time
});
```

| Option               | Type                   | Default      | Description                                                                                                                           |
| -------------------- | ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `target`             | `EventTarget`          | `globalThis` | Where keyboard events are listened for.                                                                                               |
| `debug`              | `0 \| 1 \| 2`          | `0`          | `1` logs matched bindings, `2` logs every observed key event.                                                                         |
| `checkInputElements` | `boolean`              | `true`       | When `true`, bindings are skipped while a text-entry element is focused (see below). Pass `false` to fire bindings even while typing. |
| `autostart`          | `boolean`              | `true`       | Start listening as soon as the instance is constructed.                                                                               |
| `keyMode`            | `"key" \| "code"`      | `"key"`      | `"code"` matches by physical key (`event.code`), independent of keyboard layout.                                                      |
| `initialBindings`    | `KeybindInitializer[]` | `undefined`  | Bindings to register immediately, equivalent to calling `.add()` for each.                                                            |

## API

### `.add(keyCombination, callback, preventRepeat = true, type = "keypress", options = {})`

Registers a binding. `keyCombination` is a string (`"ctrl+a"`), a construct object (`{ key: "a", ctrlKey: true }`), or an array of either to bind the same callback to several combinations at once. Returns the created `KeybindEntry[]` (one per combination).

```ts
// "cmdOrCtrl" resolves to metaKey on Mac, ctrlKey elsewhere — use it instead
// of an explicit ["ctrl+a", "meta+a"] array when you want each platform's
// own native modifier, e.g. real Cmd+A on Mac rather than always Ctrl+A.
bindKeyboard.add("cmdOrCtrl+a", selectAll);

bindKeyboard.add("ctrl+z", undo, true, "keydown", {
  description: "Undo", // shows up in getAllBindings(), useful for a shortcuts help screen
  allowInInputElements: false, // default; set true to fire even while typing
  override: true, // default; pass false to throw instead of silently replacing an existing binding
  scope: undefined, // default; tag this binding so it only fires while that scope is active — see Scopes below
});
```

Throws `KeybindError` for an invalid `type`, or when `override: false` and a binding already exists for that combination _and scope_ (see [Errors and types](#errors-and-types) below) — a binding can coexist with another one registered for the same combination under a different scope without conflicting.

`type: "keyup"` ignores `ctrlKey`/`shiftKey`/`altKey`/`metaKey` (and `cmdOrCtrl`) entirely — `add("d", cb, true, "keyup")` fires on releasing "d" no matter what other modifiers happen to still be held at that instant. This is what makes continuous-hold tracking (`.add("d", () => (held = true), true, "keydown"); .add("d", () => (held = false), true, "keyup")`) reliable even while also using a modifier-based binding on the same key (e.g. a `"shift+d"` dash while still holding `"d"` to move) — a release is a release, regardless of what else is held. `"keydown"`/`"keypress"` are unaffected by this — modifiers still fully matter there.

### `.remove(keyCombination, type = "keypress", scope = undefined)`

Removes a single binding. Returns `true` if a binding was found and removed. Pass `scope` to remove a specific scoped binding instead of the unscoped (global) one.

### `.getKeybind(keyCombination, type = "keypress", scope = undefined)`

Looks up a single binding, returning its `KeybindEntry` or `undefined`. Pass `scope` to look up a specific scoped binding instead of the unscoped (global) one.

### `.getAllBindings()`

Returns every registered `KeybindEntry` across all event types and scopes — handy for building a "keyboard shortcuts" help screen from each entry's `description`.

```ts
for (const entry of bindKeyboard.getAllBindings()) {
  console.log(entry.keyCombination, entry.description);
}
```

### `.removeAll()`

Clears every binding without touching the underlying event listeners.

### `.startListeners()` / `.stopListeners()`

Attach/detach the underlying event listeners on `target`, independent of the bindings themselves.

### `.destroy()`

Stops listening and clears every binding in one call — use it in a component's cleanup/unmount.

### `.getTarget()`

Returns the `EventTarget` this instance listens on.

## Scopes

Tag a binding with `scope` (see `.add()` above) and it only fires while that scope is active — bindings with no scope at all are unaffected and always fire. The same key combination can have a separate binding per scope, plus one more with no scope; whichever scope is currently active takes priority over the unscoped one for that combination.

```ts
bindKeyboard.add("escape", closeApp); // unscoped — always fires
bindKeyboard.add("escape", closeModal, true, "keydown", { scope: "modal" });

openModal.addEventListener("open", () => {
  bindKeyboard.enableScope("modal"); // Escape now closes the modal, not the app
});

openModal.addEventListener("close", () => {
  bindKeyboard.disableScope("modal"); // Escape goes back to closing the app
});
```

### `.enableScope(scope)` / `.disableScope(scope)`

Activate/deactivate one or more scopes (`scope` is a `string` or `string[]`), on top of whatever else is already active.

### `.setActiveScopes(scopes)`

Replaces the entire active-scope set at once — useful for temporarily restricting to just one scope (e.g. opening a modal) and later restoring exactly what was active before (closing it), without manually diffing:

```ts
const previous = bindKeyboard.getActiveScopes();
bindKeyboard.setActiveScopes(["modal"]);
// ...later:
bindKeyboard.setActiveScopes(previous);
```

### `.getActiveScopes()`

Returns the scopes currently active, as a `string[]` (no particular order).

## Errors and types

`.add()` and `.remove()` throw `KeybindError` (also exported at the top level) on misuse:

```ts
import { BindKeyboard, KeybindError } from "bind-keyboard";

try {
  bindKeyboard.add("ctrl+a", callback, true, "keypress", { override: false });
} catch (error) {
  if (error instanceof KeybindError) {
    // a binding for "ctrl + a" already existed
  }
}
```

Every type used above — `AddBindingOptions`, `KeybindCallback`, `ConstructorProps`, `KeybindInitializer`, `KeyMode`, `KeyCombination`, `KeyCombinationConstruct`, `EventType`, `DebugLevel` — is importable via the `Types` namespace:

```ts
import type { Types } from "bind-keyboard";

const handleShortcut: Types.KeybindCallback = (event) => {
  // event is a real KeyboardEvent
};

const options: Types.AddBindingOptions = { description: "Undo" };
```

## License

This project is licensed under the [MIT License](https://gitlab.com/bind-keyboard/bind-keyboard/-/blob/main/LICENSE).

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
  description: "Undo", // shows up in getAllBindings(), useful for a shortcuts help screen
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

## License

This project is licensed under the [MIT License](https://gitlab.com/bind-keyboard/bind-keyboard/-/blob/main/LICENSE).

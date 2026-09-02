# Changelog

## 1.0.0

- Export the `Types` namespace (`import type { Types } from "bind-keyboard"`) so consumers can name `AddBindingOptions`, `KeybindCallback`, `ConstructorProps`, `KeybindInitializer`, `EventType`, `DebugLevel`, `KeyMode`, `KeyCombination`, `KeyCombinationConstruct` directly.
- Export `KeybindError` at the top level (`import { KeybindError } from "bind-keyboard"`), in addition to the existing `Classes.KeybindError`.
- `add()` now warns (under `debug`) when a registered combination commonly collides with a browser/OS shortcut (e.g. `ctrl+p` for Print) — informational only, never blocks registration.
- Removed the unimplemented chord/sequence `TODO`s from the source; noted as a known limitation in the README instead.
- Fixed the grammar of the "no key or modifier provided" error message.
- Fixed a lone modifier press (e.g. tapping Ctrl by itself) producing a combination like `"ctrl + control"`/`"ctrl + controlleft"` instead of plain `"ctrl"` — a binding registered as `"ctrl"` never matched a real standalone press of that key. Affected every modifier under `keyMode: "code"`, and `ctrl` specifically under `keyMode: "key"`.
- The demo page's on-screen keyboard now matches the viewer's platform (Mac vs Windows/Linux) — correct `⌘`/`⌥` symbols, bottom-row key order, and `Delete`/`Return` labels on Mac — with auto-detection and a manual toggle.
- New `"cmdOrCtrl"` modifier alias in string key combinations (e.g. `"cmdOrCtrl+a"`), resolving to `metaKey` on Mac and `ctrlKey` everywhere else — matches each platform's own native shortcut modifier instead of always requiring the physical Ctrl key.

## 0.1.0

Breaking changes from `0.0.11`:

- `add()`'s return type changed from `Map<string, KeybindEntry> | undefined` to `KeybindEntry[]`.
- `KeybindEntry`'s constructor changed from positional arguments to a single options object.
- `checkInputElements` now also suppresses bindings while a `<select>` or any `contenteditable` element is focused, not just `<input>`/`<textarea>`.

New features:

- `keyMode: "code"` — layout-agnostic matching via `event.code`.
- `add()` accepts an array of key combinations, and a 5th `options` argument: `allowInInputElements`, `override`, `description`.
- `destroy()` — stops listening and clears every binding in one call.
- The constructor no longer throws when the target has no `addEventListener` (e.g. during server-side rendering) — it warns and skips autostart instead.
- Fixed a bug where `add()` with an array of combinations could partially register bindings before throwing on a conflicting one under `{ override: false }`.
- Fixed `keyMode: "code"` not matching punctuation combinations added as a string (e.g. `add("ctrl+,")`).

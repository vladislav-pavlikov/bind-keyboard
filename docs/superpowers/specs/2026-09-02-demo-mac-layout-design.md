# Demo: Mac / Windows-Linux Keyboard Layout Design

**Goal:** The demo page's on-screen keyboard visually matches the viewer's platform (Mac vs Windows/Linux) — correct modifier symbols and bottom-row key order — with auto-detection and a manual override. Purely cosmetic: `BindKeyboard`'s matching logic already treats `metaKey`/`altKey`/`ctrlKey` identically across platforms and is entirely unaffected by this change.

## Scope

Touches only `demo/main.ts` (and possibly a couple of new CSS rules in `demo/style.css` for the new toggle, reusing the existing `.segmented` control style). No changes to `src/`, no changes to matching behavior, no new library API.

## Detection & control

On load, detect the platform once:

```ts
const detectIsMac = (): boolean => {
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData
      ?.platform ?? navigator.platform;
  return /mac|iphone|ipad/i.test(platform);
};
```

This seeds the initial state of a new sidebar control — a `.segmented` toggle matching the existing `keyMode` toggle's visual style, placed directly below it. Label: **"Layout"**, with a small `(visual only)` hint next to it so it doesn't get confused with `keyMode` (which changes real matching behavior — `event.key` vs `event.code`). Options: `⌘ Mac` / `Win/Linux`. Switching it re-renders the keyboard only — it does not rebuild the `BindKeyboard` instance (no matching behavior involved), unlike the `keyMode`/`checkInputElements` toggles.

## What changes between modes

Only the bottom modifier row. Everything else (function row, number row, QWERTY block, Tab, Caps Lock, both Shift keys) is identical in both modes — same labels, same order, same `code` values.

| Slot | Windows/Linux           | Mac                       |
| ---- | ----------------------- | ------------------------- |
| 1    | `ControlLeft` → "Ctrl"  | `ControlLeft` → "control" |
| 2    | `MetaLeft` → "Win"      | `AltLeft` → "⌥"           |
| 3    | `AltLeft` → "Alt"       | `MetaLeft` → "⌘"          |
| 4    | Space                   | Space                     |
| 5    | `AltRight` → "Alt"      | `MetaRight` → "⌘"         |
| 6    | `MetaRight` → "Win"     | `AltRight` → "⌥"          |
| 7    | `ControlRight` → "Ctrl" | _(none)_                  |

(Windows/Linux column is the existing order, just renaming "Meta" → "Win" for clarity. Mac column swaps Option/Command into their real physical order — Control, Option, Command. Corrected after initial review: real Mac keyboards — MacBook built-ins and the current Magic Keyboard — have no physical right Control key at all, so the Mac bottom row is six keys, not a symmetric seven; the Windows/Linux row stays at seven since a right Ctrl is standard there.)

Two more labels change on Mac only, same `code`, same position in their existing row:

- `Backspace` → **"Delete"**
- `Enter` → **"Return"**

## Implementation approach

`KEYBOARD_ROWS` (currently a static `KeyDef[][]` constant) becomes a function `getKeyboardRows(isMac: boolean): KeyDef[][]`. Rows 1–5 are returned unchanged regardless of `isMac`; only the bottom row (and the `Backspace`/`Enter` labels inside rows 2 and 4) vary per the table above.

`renderKeyboard()` needs to become re-runnable: clear the keyboard container's children and reset `keyElementsByCode` before rebuilding, since toggling `isMac` must produce fresh DOM elements for the relabeled/reordered keys (the underlying `code` values for the swapped keys are unchanged, so the _codes_ used elsewhere — highlighting, combo detection — need no changes at all, only the rendered elements need to be rebuilt).

## Out of scope

- No change to `BindKeyboard`, `keyParser`, `getKeyCombination`, or any matching/detection logic — confirmed unaffected, since `event.metaKey`/`event.altKey`/`event.ctrlKey` are booleans the browser sets identically regardless of platform.
- No attempt to model an exact specific physical Mac keyboard (no `Fn` key, no arrow-cluster tradeoffs) — the existing simplified 6-row demo keyboard stays exactly as simplified as it already is, just relabeled/reordered for its bottom row.
- No persistence of the user's manual override across reloads (re-detects fresh on every page load, same as the rest of the demo's state).

## Testing

No unit tests (consistent with the rest of `demo/` — it's a demo page, not part of the published package, verified manually + the existing `demo:build`/lint/typecheck CI checks). Manual verification: load on both a Mac and non-Mac browser (or spoof `navigator.platform` via devtools), confirm auto-detected layout is correct and the manual toggle successfully switches labels/order without affecting any binding's actual matching behavior.

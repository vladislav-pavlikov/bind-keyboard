# Demo: Mac / Windows-Linux Keyboard Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The demo page's on-screen keyboard visually matches the viewer's platform (Mac vs Windows/Linux) — correct modifier symbols and bottom-row key order — with auto-detection and a manual override toggle.

**Architecture:** `demo/main.ts`'s static `KEYBOARD_ROWS` constant becomes a `getKeyboardRows(isMac: boolean)` function; `renderKeyboard()` becomes re-runnable (clears its container and the `code`→element map before rebuilding) and takes an `isMac` flag. A new sidebar `.segmented` toggle (`#layout-toggle`, matching the existing `#keymode-toggle` control) lets the viewer override the auto-detected platform; both toggles now share one small `wireSegmentedToggle` helper. Switching layout only calls `renderKeyboard()` again — it never rebuilds the `BindKeyboard` instance, since nothing about matching behavior changes.

**Tech Stack:** TypeScript, Vite (`demo:build`/`demo:dev`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-02-demo-mac-layout-design.md`

---

### Task 1: Mac/Windows-Linux layout toggle

**Files:**

- Modify: `demo/index.html`
- Modify: `demo/main.ts`

This is one cohesive change spanning both files (a markup addition plus the script logic driving it); there's no meaningful way to split it into independently-testable sub-units, and the demo has no unit tests to drive with TDD (see the "No unit tests" note in the spec's Testing section — verification here is tsc/lint/build plus manual checks, matching how the rest of `demo/` is verified).

- [ ] **Step 1: Add the Layout toggle control to `demo/index.html`**

Replace the file's full contents with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>bind-keyboard demo</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <header class="page-header">
      <h1>bind-keyboard</h1>
      <p class="subtitle">
        Live demo — press any key combination to see it detected below.
      </p>
    </header>

    <main class="layout">
      <section class="keyboard-column">
        <div id="keyboard" class="keyboard" aria-hidden="true"></div>
        <div class="combo-readout">
          <span class="combo-label">Detected combination</span>
          <code id="combo-text">—</code>
        </div>
      </section>

      <aside class="sidebar">
        <div class="control">
          <span class="control-label">keyMode</span>
          <div class="segmented" id="keymode-toggle">
            <button type="button" data-value="key" class="active">key</button>
            <button type="button" data-value="code">code</button>
          </div>
        </div>

        <div class="control">
          <div class="control-label-row">
            <span class="control-label">Layout</span>
            <span class="hint">(visual only)</span>
          </div>
          <div class="segmented" id="layout-toggle">
            <button type="button" data-value="mac" class="active">
              &#8984; Mac
            </button>
            <button type="button" data-value="win">Win/Linux</button>
          </div>
        </div>

        <div class="control">
          <label class="checkbox-row">
            <input type="checkbox" id="check-input-elements-toggle" />
            checkInputElements
          </label>
        </div>

        <div class="control">
          <label for="test-input" class="control-label"
            >Test input (for checkInputElements)</label
          >
          <input
            id="test-input"
            type="text"
            placeholder="Type here, then try a shortcut..."
          />
        </div>

        <div class="control">
          <div class="control-label-row">
            <span class="control-label">Registered shortcuts</span>
            <span class="hint">press <kbd>?</kbd> for full view</span>
          </div>
          <ul id="shortcuts-list" class="shortcuts-list"></ul>
        </div>
      </aside>
    </main>

    <div id="shortcuts-overlay" class="overlay" hidden>
      <div class="overlay-panel">
        <div class="overlay-header">
          <h2>Keyboard shortcuts</h2>
          <button type="button" id="overlay-close" aria-label="Close">
            &times;
          </button>
        </div>
        <ul id="overlay-shortcuts-list" class="shortcuts-list"></ul>
        <p class="overlay-hint">
          Built live from <code>getAllBindings()</code>.
        </p>
      </div>
    </div>

    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

The only change from the current file is the new `.control` block between the `keyMode` toggle and the `checkInputElements` checkbox (lines 35–46 above): a `.control-label-row` with the "Layout" label and a "(visual only)" hint, and a `.segmented` control `#layout-toggle` with two buttons (`data-value="mac"` / `data-value="win"`). `data-value="mac"` starts with `class="active"` as the static fallback — Step 2 corrects this to the real detected platform before first render, so it's never visible in that (possibly wrong) state.

No new CSS is needed: `.control-label-row`, `.hint`, and `.segmented`/`.segmented button`/`.segmented button.active` all already exist in `demo/style.css` (added for the `keyMode` toggle and the "Registered shortcuts" label row) and are being reused as-is, per the spec.

- [ ] **Step 2: Replace `demo/main.ts` with the layout-aware version**

Replace the file's full contents with:

```ts
import BindKeyboard from "../src";
import type { KeyMode } from "../src/types";

/**
 * Looks up a required DOM element and throws with a clear message if it's
 * missing, instead of a non-null assertion — this file assumes the fixed
 * structure of index.html, so a failure here means that structure drifted.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is a caller-supplied type-assertion helper (like querySelector<T>'s own generic), not something inferred from the arguments — that's the whole point of this wrapper.
const getElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`demo/main.ts: expected an element matching "${selector}"`);
  }
  return element;
};

// --- Keyboard layout -------------------------------------------------------
// Purely visual: maps each on-screen key to the `code` it lights up for.
// Highlighting always tracks the physical key (event.code), independent of
// the keyMode toggle below (which only changes how *matching* works).

interface KeyDef {
  code: string;
  label: string;
  width?: "1.5" | "2" | "space";
}

const lettersToKeys = (letters: string): KeyDef[] =>
  // eslint-disable-next-line @typescript-eslint/no-misused-spread -- plain ASCII A-Z literals only, no risk of Unicode code-point/code-unit mismatch.
  [...letters].map((letter) => ({ code: `Key${letter}`, label: letter }));

// Rows 1-5 never change between platforms — only the bottom modifier row
// (and the Backspace/Enter labels below) differ, since only that row's key
// *order* and *labels* differ between a real Mac and Windows/Linux keyboard.
// The underlying `code` values are identical either way, so highlighting and
// combo detection need no platform-specific handling at all.
const getKeyboardRows = (isMac: boolean): KeyDef[][] => [
  [
    { code: "Escape", label: "Esc" },
    ...Array.from({ length: 12 }, (_, i) => ({
      code: `F${i + 1}`,
      label: `F${i + 1}`,
    })),
  ],
  [
    { code: "Backquote", label: "`" },
    ...Array.from({ length: 9 }, (_, i) => ({
      code: `Digit${i + 1}`,
      label: `${i + 1}`,
    })),
    { code: "Digit0", label: "0" },
    { code: "Minus", label: "-" },
    { code: "Equal", label: "=" },
    {
      code: "Backspace",
      label: isMac ? "Delete" : "Backspace",
      width: "2",
    },
  ],
  [
    { code: "Tab", label: "Tab", width: "1.5" },
    ...lettersToKeys("QWERTYUIOP"),
    { code: "BracketLeft", label: "[" },
    { code: "BracketRight", label: "]" },
    { code: "Backslash", label: "\\" },
  ],
  [
    { code: "CapsLock", label: "Caps", width: "1.5" },
    ...lettersToKeys("ASDFGHJKL"),
    { code: "Semicolon", label: ";" },
    { code: "Quote", label: "'" },
    { code: "Enter", label: isMac ? "Return" : "Enter", width: "2" },
  ],
  [
    { code: "ShiftLeft", label: "Shift", width: "2" },
    ...lettersToKeys("ZXCVBNM"),
    { code: "Comma", label: "," },
    { code: "Period", label: "." },
    { code: "Slash", label: "/" },
    { code: "ShiftRight", label: "Shift", width: "2" },
  ],
  isMac
    ? [
        { code: "ControlLeft", label: "control", width: "1.5" },
        { code: "AltLeft", label: "⌥" },
        { code: "MetaLeft", label: "⌘" },
        { code: "Space", label: "", width: "space" },
        { code: "MetaRight", label: "⌘" },
        { code: "AltRight", label: "⌥" },
        { code: "ControlRight", label: "control", width: "1.5" },
      ]
    : [
        { code: "ControlLeft", label: "Ctrl", width: "1.5" },
        { code: "MetaLeft", label: "Win" },
        { code: "AltLeft", label: "Alt" },
        { code: "Space", label: "", width: "space" },
        { code: "AltRight", label: "Alt" },
        { code: "MetaRight", label: "Win" },
        { code: "ControlRight", label: "Ctrl", width: "1.5" },
      ],
];

// Low-entropy User-Agent Client Hint where available (Chromium), falling
// back to the older, deprecated-but-universally-supported navigator.platform
// (Safari, Firefox) — this only ever seeds the initial toggle state, the
// user can always override it manually.
const detectIsMac = (): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- userAgentData is an experimental Chromium-only API not present in lib.dom.d.ts; this is the standard feature-detection shape, guarded entirely by optional chaining below.
  const { userAgentData } = navigator as {
    userAgentData?: { platform?: string };
  };
  const platform = userAgentData?.platform ?? navigator.platform;
  return /mac|iphone|ipad/iu.test(platform);
};

// --- Live combo readout + highlighting -------------------------------------

const comboTextEl = getElement<HTMLElement>("#combo-text");
const pressedCodes = new Set<string>();
const keyElementsByCode = new Map<string, HTMLElement>();

const updateHighlighting = (): void => {
  for (const [code, el] of keyElementsByCode) {
    el.classList.toggle("pressed", pressedCodes.has(code));
  }
};

const renderKeyboard = (container: HTMLElement, isMac: boolean): void => {
  container.replaceChildren();
  keyElementsByCode.clear();

  for (const row of getKeyboardRows(isMac)) {
    const rowEl = document.createElement("div");
    rowEl.className = "kb-row";

    for (const { code, label, width } of row) {
      const keyEl = document.createElement("div");
      keyEl.className = "key";
      keyEl.textContent = label;
      if (width) keyEl.dataset.width = width;
      rowEl.appendChild(keyEl);
      keyElementsByCode.set(code, keyEl);
    }

    container.appendChild(rowEl);
  }

  updateHighlighting();
};

const KEY_MODES: readonly KeyMode[] = ["key", "code"];

const isKeyMode = (value: string | undefined): value is KeyMode =>
  (KEY_MODES as readonly string[]).includes(value ?? "");

const currentKeyMode = (): KeyMode => {
  const {
    dataset: { value },
  } = getElement<HTMLButtonElement>("#keymode-toggle .active");
  return isKeyMode(value) ? value : "key";
};

document.addEventListener("keydown", (ev) => {
  pressedCodes.add(ev.code);
  updateHighlighting();
  comboTextEl.textContent = BindKeyboard.getKeyCombination(
    ev,
    currentKeyMode(),
  );
});

document.addEventListener("keyup", (ev) => {
  pressedCodes.delete(ev.code);
  updateHighlighting();
  if (pressedCodes.size === 0) comboTextEl.textContent = "—";
});

// Avoid keys getting stuck highlighted if focus leaves the page mid-press.
window.addEventListener("blur", () => {
  pressedCodes.clear();
  updateHighlighting();
});

// --- Demo bindings + BindKeyboard instance ----------------------------------

const overlayEl = getElement<HTMLElement>("#shortcuts-overlay");

const openOverlay = (): void => {
  overlayEl.hidden = false;
};

const closeOverlay = (): void => {
  overlayEl.hidden = true;
};

const flashShortcut = (keyCombination: string): void => {
  for (const listEl of document.querySelectorAll<HTMLElement>(
    ".shortcuts-list",
  )) {
    const item = listEl.querySelector<HTMLElement>(
      `[data-combination="${keyCombination}"]`,
    );
    if (!item) continue;
    item.classList.add("flash");
    setTimeout(() => {
      item.classList.remove("flash");
    }, 400);
  }
};

const registerDemoBindings = (bindKeyboard: BindKeyboard): void => {
  const [selectAll] = bindKeyboard.add(
    "ctrl+a",
    (ev) => {
      ev.preventDefault();
      flashShortcut(selectAll.keyCombination);
    },
    true,
    "keypress",
    { description: "Select all" },
  );

  const [undo] = bindKeyboard.add(
    "ctrl+z",
    () => {
      flashShortcut(undo.keyCombination);
    },
    true,
    "keypress",
    { description: "Undo" },
  );

  const [toggleTheme] = bindKeyboard.add(
    "ctrl+/",
    (ev) => {
      ev.preventDefault();
      document.body.classList.toggle("light");
      flashShortcut(toggleTheme.keyCombination);
    },
    true,
    "keydown",
    { description: "Toggle theme" },
  );

  const [closeShortcut] = bindKeyboard.add(
    "escape",
    () => {
      closeOverlay();
      flashShortcut(closeShortcut.keyCombination);
    },
    true,
    "keydown",
    {
      description: "Close the shortcuts overlay",
      allowInInputElements: true,
    },
  );

  // Registered via the object construct (not a "shift+/" string) with both
  // `key` and `code` set explicitly: "?" only exists as a *shifted* symbol,
  // which keyParser's string-form code-guessing deliberately doesn't cover
  // (see the caveat on guessCodeFromKey in src/helpers/keyParser.ts) — so a
  // string-registered "shift+/" would stop matching real Shift+/ keydowns
  // the moment keyMode switches to "code". Setting both properties here
  // keeps it correct in either mode.
  const [showAll] = bindKeyboard.add(
    { key: "?", code: "Slash", shiftKey: true },
    (ev) => {
      ev.preventDefault();
      openOverlay();
      flashShortcut(showAll.keyCombination);
    },
    true,
    "keydown",
    { description: "Show all shortcuts" },
  );
};

const renderShortcutsInto = (
  listEl: HTMLElement,
  bindKeyboard: BindKeyboard,
): void => {
  listEl.replaceChildren();

  for (const {
    keyCombination,
    description: entryDescription,
  } of bindKeyboard.getAllBindings()) {
    const item = document.createElement("li");
    item.dataset.combination = keyCombination;

    const combo = document.createElement("kbd");
    combo.textContent = keyCombination;

    const description = document.createElement("span");
    description.textContent = entryDescription ?? "";

    item.append(combo, description);
    listEl.appendChild(item);
  }
};

const renderShortcuts = (bindKeyboard: BindKeyboard): void => {
  renderShortcutsInto(getElement<HTMLElement>("#shortcuts-list"), bindKeyboard);
  renderShortcutsInto(
    getElement<HTMLElement>("#overlay-shortcuts-list"),
    bindKeyboard,
  );
};

const createBindKeyboard = (): BindKeyboard => {
  const bindKeyboard = new BindKeyboard({
    keyMode: currentKeyMode(),
    checkInputElements: getElement<HTMLInputElement>(
      "#check-input-elements-toggle",
    ).checked,
  });

  registerDemoBindings(bindKeyboard);
  renderShortcuts(bindKeyboard);

  return bindKeyboard;
};

let bindKeyboard = createBindKeyboard();

const rebuildBindKeyboard = (): void => {
  bindKeyboard.destroy();
  bindKeyboard = createBindKeyboard();
};

// --- Wiring ------------------------------------------------------------------

const wireSegmentedToggle = (selector: string, onChange: () => void): void => {
  getElement<HTMLElement>(selector).addEventListener("click", (ev) => {
    if (!(ev.target instanceof HTMLElement)) return;
    const button = ev.target.closest("button");
    if (!button?.parentElement) return;

    for (const sibling of button.parentElement.children) {
      sibling.classList.toggle("active", sibling === button);
    }

    onChange();
  });
};

const currentIsMac = (): boolean =>
  getElement<HTMLButtonElement>("#layout-toggle .active").dataset.value ===
  "mac";

// index.html hardcodes "mac" as the default-active button in the layout
// toggle (a reasonable static fallback) — seed it from platform detection
// before the first paint that matters, since this script runs synchronously.
for (const button of getElement<HTMLElement>(
  "#layout-toggle",
).querySelectorAll<HTMLButtonElement>("button")) {
  button.classList.toggle(
    "active",
    button.dataset.value === (detectIsMac() ? "mac" : "win"),
  );
}

renderKeyboard(getElement<HTMLElement>("#keyboard"), currentIsMac());

wireSegmentedToggle("#keymode-toggle", rebuildBindKeyboard);

wireSegmentedToggle("#layout-toggle", () => {
  renderKeyboard(getElement<HTMLElement>("#keyboard"), currentIsMac());
});

getElement<HTMLInputElement>("#check-input-elements-toggle").addEventListener(
  "change",
  rebuildBindKeyboard,
);

getElement<HTMLElement>("#overlay-close").addEventListener(
  "click",
  closeOverlay,
);

overlayEl.addEventListener("click", (ev) => {
  if (ev.target === overlayEl) closeOverlay();
});
```

Summary of what changed vs. the current file:

- `KEYBOARD_ROWS` (a static constant) became `getKeyboardRows(isMac: boolean): KeyDef[][]` — rows 1–5 unchanged, only the bottom row (plus the `Backspace`/`Enter` labels in rows 2 and 4) branch on `isMac`.
- New `detectIsMac()` function.
- `comboTextEl`, `pressedCodes`, `keyElementsByCode`, and `updateHighlighting` moved above `renderKeyboard` (pure reordering — `renderKeyboard` now calls `updateHighlighting()` at its end, so it must be declared after it).
- `renderKeyboard(container)` became `renderKeyboard(container, isMac)`, and now does `container.replaceChildren(); keyElementsByCode.clear();` before rebuilding, then calls `getKeyboardRows(isMac)` and `updateHighlighting()`.
- New `wireSegmentedToggle(selector, onChange)` helper factoring out the click-handling logic that was previously inlined only for `#keymode-toggle`.
- New `currentIsMac()` reader (mirrors the existing `currentKeyMode()` pattern).
- The "Wiring" section now seeds `#layout-toggle`'s active button from `detectIsMac()`, passes `currentIsMac()` into the initial `renderKeyboard()` call, wires `#keymode-toggle` through `wireSegmentedToggle` (behavior unchanged — still calls `rebuildBindKeyboard`), and wires `#layout-toggle` through `wireSegmentedToggle` too, but with a callback that only calls `renderKeyboard()` again — **not** `rebuildBindKeyboard()`, since layout is purely visual.

- [ ] **Step 3: Typecheck both configs**

Run:

```bash
npx tsc --noEmit -p tsconfig.json
npx tsc --noEmit -p demo/tsconfig.json
```

Expected: both exit with no output (no errors).

- [ ] **Step 4: Lint**

Run:

```bash
npm run lint
```

Expected: no errors. (Two pre-existing `@typescript-eslint/no-deprecated` warnings on `startListners`/`stopListners` in `src/index.test.ts`, and one on `navigator.platform` in the new `detectIsMac`, are expected and fine — `navigator.platform` is deprecated but is the correct universal fallback here, same tradeoff the spec calls out.)

- [ ] **Step 5: Build the library and the demo**

Run:

```bash
npm run build
npm run demo:build
```

Expected: both succeed. `demo:build` output should list `public/index.html` and the built JS/CSS assets with no errors.

- [ ] **Step 6: Run the full test suite**

Run:

```bash
npm test
```

Expected: all existing tests still pass (this change touches only `demo/`, not `src/`, so the count should be unchanged from before this task).

- [ ] **Step 7: Manual verification**

Run the demo locally:

```bash
npm run demo:dev
```

Open the printed local URL and check:

- The `Layout` toggle in the sidebar starts on `⌘ Mac` when opened in a Mac browser (or on `Win/Linux` in a non-Mac browser / a spoofed `navigator.platform` via devtools).
- On the Mac layout, the bottom row reads (left to right): `control`, `⌥`, `⌘`, space, `⌘`, `⌥`, `control`; the Backspace-slot key reads `Delete`; the Enter-slot key reads `Return`.
- Clicking `Win/Linux` switches the bottom row to: `Ctrl`, `Win`, `Alt`, space, `Alt`, `Win`, `Ctrl`; Backspace-slot reads `Backspace`; Enter-slot reads `Enter`.
- Switching layout does not interrupt in-progress bindings: register a shortcut is still highlighted correctly and `ctrl+a`/`ctrl+z`/`ctrl+/`/`?` still work exactly as before in both layout modes (layout is cosmetic only).
- Physical key highlighting still tracks the correct on-screen key after switching layouts (e.g. press the OS Cmd/Meta key and confirm the `⌘` key lights up on the Mac layout).

- [ ] **Step 8: Commit**

```bash
git add demo/index.html demo/main.ts
git commit -m "feat(demo): add Mac / Windows-Linux keyboard layout toggle"
```

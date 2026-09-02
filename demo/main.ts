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

const currentIsMac = (): boolean =>
  getElement<HTMLButtonElement>("#layout-toggle .active").dataset.value ===
  "mac";

// getKeyCombination's "meta"/"alt" tokens are deliberately platform-neutral
// (they mirror KeyboardEvent.metaKey/altKey, matched identically everywhere)
// — but on screen they should read the way the current layout's own keys are
// labeled, same as the on-screen keyboard already does (⌘/⌥ on Mac, "Win"/
// "alt" elsewhere). Purely a display transform: matching/registration always
// still use "meta"/"alt".
const DISPLAY_TOKEN_OVERRIDES: Partial<
  Record<string, [mac: string, other: string]>
> = {
  meta: ["⌘", "win"],
  alt: ["⌥", "alt"],
};

const formatKeyCombinationForDisplay = (
  keyCombination: string,
  isMac: boolean,
): string =>
  keyCombination
    .split(" + ")
    .map((token) => {
      const { [token]: override } = DISPLAY_TOKEN_OVERRIDES;
      return override ? override[isMac ? 0 : 1] : token;
    })
    .join(" + ");

// Modifier codes never count as the combo's "base" key — holding just
// Ctrl+Cmd should read as that alone (no base key), the same way
// getKeyCombination already collapses a lone modifier press.
const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

// The most recently pressed non-modifier key/code that's still held, if
// any. Tracked separately from the triggering event so the readout can
// correctly fall back to "just the modifiers" (or reset entirely) as keys
// are released one at a time, instead of freezing at whatever combination
// last fired on keydown — reusing the *event*'s own key/code on keyup would
// be wrong, since that's the key being released, not one still held.
let heldKey: { key: string; code: string } | undefined = undefined;

const updateComboText = (ev: KeyboardEvent): void => {
  if (pressedCodes.size === 0) {
    heldKey = undefined;
    comboTextEl.textContent = "—";
    return;
  }

  if (!MODIFIER_CODES.has(ev.code) && pressedCodes.has(ev.code)) {
    heldKey = { key: ev.key, code: ev.code };
  } else if (heldKey && !pressedCodes.has(heldKey.code)) {
    heldKey = undefined;
  }

  const keyCombination = BindKeyboard.getKeyCombination(
    {
      ctrlKey: ev.ctrlKey,
      shiftKey: ev.shiftKey,
      altKey: ev.altKey,
      metaKey: ev.metaKey,
      key: heldKey?.key,
      code: heldKey?.code,
    },
    currentKeyMode(),
  );
  comboTextEl.textContent = formatKeyCombinationForDisplay(
    keyCombination,
    currentIsMac(),
  );
};

document.addEventListener("keydown", (ev) => {
  pressedCodes.add(ev.code);
  updateHighlighting();
  updateComboText(ev);
});

document.addEventListener("keyup", (ev) => {
  pressedCodes.delete(ev.code);
  updateHighlighting();
  updateComboText(ev);
});

// Avoid keys (or the readout) getting stuck mid-combo if focus leaves the
// page mid-press.
window.addEventListener("blur", () => {
  pressedCodes.clear();
  heldKey = undefined;
  updateHighlighting();
  comboTextEl.textContent = "—";
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
  // "cmdOrCtrl" resolves to Cmd on Mac / Ctrl elsewhere, so these three
  // match each platform's own native muscle memory (Cmd+A really is Select
  // All on Mac) instead of always being the physical Ctrl key regardless of
  // platform.
  const [selectAll] = bindKeyboard.add(
    "cmdOrCtrl+a",
    (ev) => {
      ev.preventDefault();
      flashShortcut(selectAll.keyCombination);
    },
    true,
    "keypress",
    { description: "Select all" },
  );

  const [undo] = bindKeyboard.add(
    "cmdOrCtrl+z",
    () => {
      flashShortcut(undo.keyCombination);
    },
    true,
    "keypress",
    { description: "Undo" },
  );

  const [toggleTheme] = bindKeyboard.add(
    "cmdOrCtrl+/",
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
    combo.textContent = formatKeyCombinationForDisplay(
      keyCombination,
      currentIsMac(),
    );

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

// Shared by every "Copy" button on the page (the install command and the
// code sample): copies sourceEl's text to the clipboard, falling back to
// selecting it (for browsers/contexts without the Clipboard API) if that
// fails, and flashes a brief confirmation on the triggering button.
const copyTextFrom = async (
  sourceEl: HTMLElement,
  button: HTMLButtonElement,
): Promise<void> => {
  const { textContent: text } = sourceEl;
  let feedback = "Copied!";

  try {
    // navigator.clipboard requires a secure context and isn't guaranteed to
    // exist at runtime even though the DOM types say it always does — if
    // it's missing, accessing .writeText below throws synchronously and
    // falls through to the manual-selection fallback in the catch block.
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers/contexts without the Clipboard API: select the
    // text so the viewer can copy it manually.
    const range = document.createRange();
    range.selectNodeContents(sourceEl);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    feedback = "Selected — press ⌘/Ctrl+C";
  }

  // Mutating the passed-in button's textContent is the entire point of this
  // helper (flashing feedback on whichever button triggered it), not an
  // accidental side effect on caller-owned state.
  const { textContent: originalLabel } = button;
  // eslint-disable-next-line no-param-reassign -- see comment above.
  button.textContent = feedback;
  setTimeout(() => {
    // eslint-disable-next-line no-param-reassign -- see comment above.
    button.textContent = originalLabel;
  }, 1500);
};

// --- Install command ---------------------------------------------------------

const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const isPackageManager = (value: string | undefined): value is PackageManager =>
  (PACKAGE_MANAGERS as readonly string[]).includes(value ?? "");

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm install bind-keyboard",
  yarn: "yarn add bind-keyboard",
  pnpm: "pnpm add bind-keyboard",
  bun: "bun add bind-keyboard",
};

const currentPackageManager = (): PackageManager => {
  const {
    dataset: { value },
  } = getElement<HTMLButtonElement>("#install-toggle .active");
  return isPackageManager(value) ? value : "npm";
};

const installCommandEl = getElement<HTMLElement>("#install-command-text");
const copyInstallButton = getElement<HTMLButtonElement>("#copy-install");

const renderInstallCommand = (): void => {
  const { [currentPackageManager()]: command } = INSTALL_COMMANDS;
  installCommandEl.textContent = command;
};

copyInstallButton.addEventListener("click", () => {
  void copyTextFrom(installCommandEl, copyInstallButton);
});

// --- Live code sample --------------------------------------------------------
// Mirrors the currently selected keyMode/checkInputElements settings into a
// copy-pasteable snippet, so the sample the viewer copies always matches what
// they're actually seeing the demo do. "cmdOrCtrl+k" is a neutral
// placeholder — it isn't bound to anything real on this page, unlike the
// demo's own bindings — that also doubles as a demonstration of the
// cmdOrCtrl alias itself (Cmd on Mac, Ctrl elsewhere).

const codeSampleEl = getElement<HTMLElement>("#code-sample-text");
const copyCodeButton = getElement<HTMLButtonElement>("#copy-code");

const renderCodeSample = (): void => {
  const keyMode = currentKeyMode();
  const { checked: checkInputElements } = getElement<HTMLInputElement>(
    "#check-input-elements-toggle",
  );

  codeSampleEl.textContent = [
    `import BindKeyboard from "bind-keyboard";`,
    ``,
    `const bindKeyboard = new BindKeyboard({`,
    `  keyMode: ${JSON.stringify(keyMode)},`,
    `  checkInputElements: ${String(checkInputElements)},`,
    `});`,
    ``,
    `bindKeyboard.add("cmdOrCtrl+k", (event) => {`,
    `  event.preventDefault();`,
    `  // your code here`,
    `});`,
  ].join("\n");
};

copyCodeButton.addEventListener("click", () => {
  void copyTextFrom(codeSampleEl, copyCodeButton);
});

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

// keyMode/checkInputElements both affect actual matching behavior, so
// changing either must rebuild the BindKeyboard instance *and* refresh the
// code sample that mirrors those settings (unlike the Layout toggle, which
// only ever re-renders the keyboard — see the Wiring section below).
const updateSettingsDependents = (): void => {
  rebuildBindKeyboard();
  renderCodeSample();
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

const keyboardEl = getElement<HTMLElement>("#keyboard");

renderKeyboard(keyboardEl, currentIsMac());
renderCodeSample();
renderInstallCommand();

wireSegmentedToggle("#keymode-toggle", updateSettingsDependents);

wireSegmentedToggle("#layout-toggle", () => {
  renderKeyboard(keyboardEl, currentIsMac());
  // The shortcuts list's ⌘/⌥ vs win/alt display also depends on the layout,
  // even though this toggle never touches the underlying BindKeyboard
  // instance or its actual (unchanged) keyCombination strings.
  renderShortcuts(bindKeyboard);
});

wireSegmentedToggle("#install-toggle", renderInstallCommand);

getElement<HTMLInputElement>("#check-input-elements-toggle").addEventListener(
  "change",
  updateSettingsDependents,
);

getElement<HTMLElement>("#overlay-close").addEventListener(
  "click",
  closeOverlay,
);

overlayEl.addEventListener("click", (ev) => {
  if (ev.target === overlayEl) closeOverlay();
});

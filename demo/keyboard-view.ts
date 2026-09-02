import BindKeyboard from "../src";
import type { KeyMode } from "../src/types";
import { getElement } from "./dom";

// --- Keyboard layout ---------------------------------------------------------
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
export const detectIsMac = (): boolean => {
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

export const renderKeyboard = (
  container: HTMLElement,
  isMac: boolean,
): void => {
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

export const currentKeyMode = (): KeyMode => {
  const {
    dataset: { value },
  } = getElement<HTMLButtonElement>("#keymode-toggle .active");
  return isKeyMode(value) ? value : "code";
};

export const currentIsMac = (): boolean =>
  getElement<HTMLButtonElement>("#layout-toggle .active").dataset.value ===
  "mac";

// getKeyCombination's "meta"/"alt" tokens are deliberately platform-neutral
// (they mirror KeyboardEvent.metaKey/altKey, matched identically everywhere)
// — but on screen they should read the way the current layout's own keys are
// labeled, same as the on-screen keyboard already does (⌘/⌥ on Mac, "Win"/
// "alt" elsewhere). Purely a display transform: matching/registration always
// still use "meta"/"alt". Arrow keys aren't platform-dependent, but get the
// same treatment — "arrowleft" reads a lot better as "←" (used by the bonus
// game's bindings popup).
const DISPLAY_TOKEN_OVERRIDES: Partial<
  Record<string, [mac: string, other: string]>
> = {
  meta: ["⌘", "win"],
  alt: ["⌥", "alt"],
  arrowleft: ["←", "←"],
  arrowright: ["→", "→"],
  arrowup: ["↑", "↑"],
  arrowdown: ["↓", "↓"],
};

export const formatKeyCombinationForDisplay = (
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

  // pressedCodes can drift from reality — e.g. a keyup gets missed around a
  // focus change, or (now that the page also has a second, independent
  // BindKeyboard instance for the bonus game) some interleaving of events
  // this tracking didn't anticipate. If that leaves no held base key and
  // no active modifier even though pressedCodes is non-empty, there's
  // nothing real to show — and passing all of that as-is to
  // getKeyCombination would throw. Self-heal: whatever's left in
  // pressedCodes at that point isn't valid either, so clear it too.
  if (!ev.ctrlKey && !ev.shiftKey && !ev.altKey && !ev.metaKey && !heldKey) {
    pressedCodes.clear();
    updateHighlighting();
    comboTextEl.textContent = "—";
    return;
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

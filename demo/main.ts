import { getElement, wireSegmentedToggle } from "./dom";
import { currentIsMac, detectIsMac, renderKeyboard } from "./keyboard-view";
import { createBindKeyboard, renderShortcuts } from "./bindings";
import { renderInstallCommand } from "./install-command";
import { renderCodeSample } from "./code-sample";
import "./movement-game";

let bindKeyboard = createBindKeyboard();

const rebuildBindKeyboard = (): void => {
  bindKeyboard.destroy();
  bindKeyboard = createBindKeyboard();
};

// keyMode/checkInputElements both affect actual matching behavior, so
// changing either must rebuild the BindKeyboard instance *and* refresh the
// code sample that mirrors those settings (unlike the Layout toggle, which
// only ever re-renders the keyboard — see below).
const updateSettingsDependents = (): void => {
  rebuildBindKeyboard();
  renderCodeSample();
};

// --- Wiring ------------------------------------------------------------------

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

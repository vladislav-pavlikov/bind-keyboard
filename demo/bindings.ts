import BindKeyboard from "../src";
import { getElement } from "./dom";
import {
  currentIsMac,
  currentKeyMode,
  formatKeyCombinationForDisplay,
} from "./keyboard-view";

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
  //
  // All bindings here use "keydown", not "keypress" — "keypress" is
  // deprecated and, worse, unreliable for modifier combinations: Chrome and
  // Safari on macOS don't consistently fire it for Cmd+letter combos, so a
  // binding registered on "keypress" can silently never fire for a real
  // Cmd+A/Cmd+Z press even though the key is clearly being detected
  // (the on-screen keyboard still lights up, since that's driven by
  // keydown/keyup directly, not by this binding at all).
  const [selectAll] = bindKeyboard.add(
    "cmdOrCtrl+a",
    (ev) => {
      ev.preventDefault();
      flashShortcut(selectAll.keyCombination);
    },
    true,
    "keydown",
    { description: "Select all" },
  );

  const [undo] = bindKeyboard.add(
    "cmdOrCtrl+z",
    () => {
      flashShortcut(undo.keyCombination);
    },
    true,
    "keydown",
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

export const renderShortcuts = (bindKeyboard: BindKeyboard): void => {
  renderShortcutsInto(getElement<HTMLElement>("#shortcuts-list"), bindKeyboard);
  renderShortcutsInto(
    getElement<HTMLElement>("#overlay-shortcuts-list"),
    bindKeyboard,
  );
};

export const createBindKeyboard = (): BindKeyboard => {
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

getElement<HTMLElement>("#overlay-close").addEventListener(
  "click",
  closeOverlay,
);

overlayEl.addEventListener("click", (ev) => {
  if (ev.target === overlayEl) closeOverlay();
});

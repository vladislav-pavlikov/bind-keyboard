import BindKeyboard from "../src";
import { getElement } from "./dom";
import { currentKeyMode } from "./keyboard-view";
import { renderShortcutsInto } from "./shortcuts-list";
import {
  notifyOverlayClosed,
  notifyOverlayOpened,
  registerOverlayScopeHandle,
} from "./overlay-scopes";

// --- Demo bindings + BindKeyboard instance ----------------------------------
// The demo's own non-overlay bindings (select all/undo/toggle theme, below)
// live under the "keyboard" scope, active by default and suspended while
// *either* this page's overlay is open (see ./overlay-scopes) — "?" (opens
// this overlay) and "escape" (closes it) stay unscoped so they keep working
// regardless.

// Reassigned on every rebuild (see main.ts's rebuildBindKeyboard) — the
// scope handle below is registered once, at module load, but always needs
// to act on whichever instance currently exists.
let currentBindKeyboard: BindKeyboard | undefined = undefined;

registerOverlayScopeHandle({
  disable: () => currentBindKeyboard?.disableScope("keyboard"),
  enable: () => currentBindKeyboard?.enableScope("keyboard"),
});

const overlayEl = getElement<HTMLElement>("#shortcuts-overlay");

const openOverlay = (): void => {
  overlayEl.hidden = false;
  notifyOverlayOpened("main-shortcuts");
};

const closeOverlay = (): void => {
  overlayEl.hidden = true;
  notifyOverlayClosed("main-shortcuts");
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

// A scoped binding is the *only* one that runs while its scope is active
// (see BindKeyboard#resolveEntry) — while "keyboard" is suspended (a popup
// open), nothing registered for that combination fires at all, including
// a scoped callback's own ev.preventDefault(). Without this, opening a
// popup would let the browser's own Cmd+A ("Select All" on the page) or
// Cmd+/ take over again — worse than doing nothing. This unscoped
// companion fires *instead of* the scoped one exactly when "keyboard"
// isn't active (an active scope's own entry always wins over an unscoped
// one for the same combination — see the README's Scopes section), so
// between the two, preventDefault always happens either way.
const preventBrowserDefaultWhileSuspended = (
  bindKeyboard: BindKeyboard,
  combo: string,
): void => {
  bindKeyboard.add(
    combo,
    (ev) => {
      ev.preventDefault();
    },
    true,
    "keydown",
  );
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
    { description: "Select all", scope: "keyboard" },
  );
  preventBrowserDefaultWhileSuspended(bindKeyboard, "cmdOrCtrl+a");

  const [undo] = bindKeyboard.add(
    "cmdOrCtrl+z",
    () => {
      flashShortcut(undo.keyCombination);
    },
    true,
    "keydown",
    { description: "Undo", scope: "keyboard" },
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
    { description: "Toggle theme", scope: "keyboard" },
  );
  preventBrowserDefaultWhileSuspended(bindKeyboard, "cmdOrCtrl+/");

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
  bindKeyboard.enableScope("keyboard");
  currentBindKeyboard = bindKeyboard;

  return bindKeyboard;
};

getElement<HTMLElement>("#overlay-close").addEventListener(
  "click",
  closeOverlay,
);

overlayEl.addEventListener("click", (ev) => {
  if (ev.target === overlayEl) closeOverlay();
});

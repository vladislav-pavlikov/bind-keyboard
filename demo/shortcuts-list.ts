import type BindKeyboard from "../src";
import { currentIsMac, formatKeyCombinationForDisplay } from "./keyboard-view";

// Shared by every "shortcuts list" on the page (the main demo's sidebar
// list + its "?" overlay, and the bonus game's own "Bindings" overlay):
// renders getAllBindings() into a <ul>, one <li> per binding that has a
// description. Bindings without one — e.g. a "keyup" companion that just
// resets some held-key state — are internal bookkeeping, not something a
// visitor needs to see in a shortcuts summary.
export const renderShortcutsInto = (
  listEl: HTMLElement,
  bindKeyboard: BindKeyboard,
): void => {
  listEl.replaceChildren();

  for (const {
    keyCombination,
    description: entryDescription,
  } of bindKeyboard.getAllBindings()) {
    if (!entryDescription) continue;

    const item = document.createElement("li");
    item.dataset.combination = keyCombination;

    const combo = document.createElement("kbd");
    combo.textContent = formatKeyCombinationForDisplay(
      keyCombination,
      currentIsMac(),
    );

    const description = document.createElement("span");
    description.textContent = entryDescription;

    item.append(combo, description);
    listEl.appendChild(item);
  }
};

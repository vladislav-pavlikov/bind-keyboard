import type BindKeyboard from "../src";
import { currentIsMac, formatKeyCombinationForDisplay } from "./keyboard-view";

// Shared by every "shortcuts list" on the page (the main demo's sidebar
// list + its "?" overlay, and the bonus game's own "Bindings" overlay):
// renders getAllBindings() into a <ul>. Bindings without a description —
// e.g. a "keyup" companion that just resets some held-key state — are
// internal bookkeeping, not something a visitor needs to see in a
// shortcuts summary, so those are skipped. Several combinations sharing
// one description (e.g. the bonus game's WASD + arrow-key alternatives)
// collapse into a single row listing every alternative, rather than one
// repeated row per combination — this never changes the main demo's own
// list, since none of its descriptions are shared to begin with.
export const renderShortcutsInto = (
  listEl: HTMLElement,
  bindKeyboard: BindKeyboard,
): void => {
  listEl.replaceChildren();

  const combosByDescription = new Map<string, string[]>();
  for (const { keyCombination, description } of bindKeyboard.getAllBindings()) {
    if (!description) continue;
    const combos = combosByDescription.get(description) ?? [];
    combos.push(keyCombination);
    combosByDescription.set(description, combos);
  }

  for (const [description, combos] of combosByDescription) {
    const item = document.createElement("li");
    // Only used to look up which row to flash when a binding fires — an
    // arbitrary single combination is enough for that, even for a row
    // listing several alternatives.
    [item.dataset.combination] = combos;

    const comboEl = document.createElement("span");
    comboEl.className = "shortcut-combos";
    for (const [index, combo] of combos.entries()) {
      if (index > 0) comboEl.append(" or ");
      const kbd = document.createElement("kbd");
      kbd.textContent = formatKeyCombinationForDisplay(combo, currentIsMac());
      comboEl.appendChild(kbd);
    }

    const descriptionEl = document.createElement("span");
    descriptionEl.textContent = description;

    item.append(comboEl, descriptionEl);
    listEl.appendChild(item);
  }
};

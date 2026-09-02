/**
 * Looks up a required DOM element and throws with a clear message if it's
 * missing, instead of a non-null assertion — the demo assumes the fixed
 * structure of index.html, so a failure here means that structure drifted.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- T is a caller-supplied type-assertion helper (like querySelector<T>'s own generic), not something inferred from the arguments — that's the whole point of this wrapper.
export const getElement = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`demo: expected an element matching "${selector}"`);
  }
  return element;
};

// Generic click handler for a ".segmented" toggle control (keyMode, Layout,
// install package manager): moves the "active" class to whichever button
// was clicked, then runs onChange.
export const wireSegmentedToggle = (
  selector: string,
  onChange: () => void,
): void => {
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

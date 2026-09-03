/**
 * `document.activeElement` stops at the boundary of an open shadow root: if
 * a custom element hosts one and something inside it has focus, `document`
 * only ever reports the host element itself, never the actual focused
 * descendant. mousetrap's own test suite has a dedicated case for exactly
 * this ("z key does not fire when inside an input element in an open
 * shadow dom") — confirmed the same gap existed here too before this fix.
 * Each shadow root's own `activeElement` picks up where the outer one left
 * off, so walking `.shadowRoot.activeElement` down as far as it goes finds
 * the real, innermost focused element regardless of how many open shadow
 * roots it's nested behind. A closed shadow root can't be introspected at
 * all by design — that boundary is intentionally opaque, so this simply
 * stops there and reports the (closed) host itself, same as before.
 */
const deepestActiveElement = (root: Document | ShadowRoot): Element | null => {
  const { activeElement } = root;

  return activeElement?.shadowRoot
    ? deepestActiveElement(activeElement.shadowRoot)
    : activeElement;
};

/**
 * Checks whether the currently focused element is a text-entry surface:
 * an input, textarea, select, or any contenteditable element (rich-text
 * editors, chat boxes, etc).
 *
 * @returns {boolean} True if the active element accepts text input, otherwise false.
 */
const isInputOrTextArea = (): boolean => {
  const activeElement = deepestActiveElement(document);

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  );
};

export default isInputOrTextArea;

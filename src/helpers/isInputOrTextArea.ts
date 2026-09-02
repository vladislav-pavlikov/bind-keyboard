/**
 * Checks whether the currently focused element is a text-entry surface:
 * an input, textarea, select, or any contenteditable element (rich-text
 * editors, chat boxes, etc).
 *
 * @returns {boolean} True if the active element accepts text input, otherwise false.
 */
const isInputOrTextArea = (): boolean => {
  const { activeElement } = document;

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  );
};

export default isInputOrTextArea;

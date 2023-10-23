/**
 * Checks if the active element is an input or textarea element.
 *
 * @returns {boolean} True if the active element is an input or textarea element, otherwise false.
 */
const isInputOrTextArea = (): boolean => {
  const { activeElement } = document;
  const isInputOrTextArea =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement;

  return isInputOrTextArea;
};

export default isInputOrTextArea;

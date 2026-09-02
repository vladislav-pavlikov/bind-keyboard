// Reads sourceEl's copyable text. The numbered code-sample view (see
// code-sample.ts) is built from one <div class="code-line"> per line, each
// with a CSS-only generated line number, so plain .textContent would
// concatenate every line's text with no newlines between them — join them
// explicitly instead. Anything without .code-line children (the single-line
// install command) just uses .textContent as-is.
const getCopyableText = (sourceEl: HTMLElement): string => {
  const lines = sourceEl.querySelectorAll<HTMLElement>(".code-line");
  if (lines.length === 0) return sourceEl.textContent;
  return [...lines].map((line) => line.textContent).join("\n");
};

// Shared by every "Copy" button on the page (the install command and the
// code sample): copies sourceEl's text to the clipboard, falling back to
// selecting it (for browsers/contexts without the Clipboard API) if that
// fails, and flashes a brief confirmation on the triggering button.
export const copyTextFrom = async (
  sourceEl: HTMLElement,
  button: HTMLButtonElement,
): Promise<void> => {
  const text = getCopyableText(sourceEl);
  let feedback = "Copied!";

  try {
    // navigator.clipboard requires a secure context and isn't guaranteed to
    // exist at runtime even though the DOM types say it always does — if
    // it's missing, accessing .writeText below throws synchronously and
    // falls through to the manual-selection fallback in the catch block.
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for browsers/contexts without the Clipboard API: select the
    // text so the viewer can copy it manually.
    const range = document.createRange();
    range.selectNodeContents(sourceEl);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    feedback = "Selected — press ⌘/Ctrl+C";
  }

  // Mutating the passed-in button's textContent is the entire point of this
  // helper (flashing feedback on whichever button triggered it), not an
  // accidental side effect on caller-owned state.
  const { textContent: originalLabel } = button;
  // eslint-disable-next-line no-param-reassign -- see comment above.
  button.textContent = feedback;
  setTimeout(() => {
    // eslint-disable-next-line no-param-reassign -- see comment above.
    button.textContent = originalLabel;
  }, 1500);
};

import type { KeyMode } from "../src/types";
import { getElement } from "./dom";
import { copyTextFrom } from "./copy-to-clipboard";
import { currentKeyMode } from "./keyboard-view";

// --- Live code sample --------------------------------------------------------
// Mirrors the currently selected keyMode/checkInputElements settings into a
// copy-pasteable snippet, so the sample the viewer copies always matches what
// they're actually seeing the demo do. "cmdOrCtrl+k" is a neutral
// placeholder — it isn't bound to anything real on this page, unlike the
// demo's own bindings — that also doubles as a demonstration of the
// cmdOrCtrl alias itself (Cmd on Mac, Ctrl elsewhere).

const codeSampleEl = getElement<HTMLElement>("#code-sample-text");
const copyCodeButton = getElement<HTMLButtonElement>("#copy-code");

// Hand-authored tokens for this one fixed template (not a general
// tokenizer) — each token optionally carries a `cls` naming one of the
// `.tok-*` color rules in style.css. Safe to build directly from these
// values with no escaping: keyMode is always "key"/"code" and
// checkInputElements is always "true"/"false", both from JSON.stringify /
// String on values this file itself controls, never external input.
interface CodeToken {
  text: string;
  cls?: "keyword" | "type" | "var" | "func" | "string" | "bool" | "comment";
}

const codeSampleLines = (
  keyMode: KeyMode,
  checkInputElements: boolean,
): CodeToken[][] => [
  [
    { text: "import ", cls: "keyword" },
    { text: "BindKeyboard", cls: "type" },
    { text: " from ", cls: "keyword" },
    { text: '"bind-keyboard"', cls: "string" },
    { text: ";" },
  ],
  [],
  [
    { text: "const ", cls: "keyword" },
    { text: "bindKeyboard", cls: "var" },
    { text: " = " },
    { text: "new ", cls: "keyword" },
    { text: "BindKeyboard", cls: "type" },
    { text: "({" },
  ],
  [
    { text: "  " },
    { text: "keyMode", cls: "var" },
    { text: ": " },
    { text: JSON.stringify(keyMode), cls: "string" },
    { text: "," },
  ],
  [
    { text: "  " },
    { text: "checkInputElements", cls: "var" },
    { text: ": " },
    { text: String(checkInputElements), cls: "bool" },
    { text: "," },
  ],
  [{ text: "});" }],
  [],
  [
    { text: "bindKeyboard", cls: "var" },
    { text: "." },
    { text: "add", cls: "func" },
    { text: "(" },
    { text: '"cmdOrCtrl+k"', cls: "string" },
    { text: ", (" },
    { text: "event", cls: "var" },
    { text: ") => {" },
  ],
  [
    { text: "  " },
    { text: "event", cls: "var" },
    { text: "." },
    { text: "preventDefault", cls: "func" },
    { text: "();" },
  ],
  [{ text: "  // your code here", cls: "comment" }],
  [{ text: "});" }],
];

const renderCodeLine = (tokens: CodeToken[]): HTMLElement => {
  const lineEl = document.createElement("div");
  lineEl.className = "code-line";

  for (const { text, cls } of tokens) {
    if (!cls) {
      lineEl.append(text);
      continue;
    }
    const tokenEl = document.createElement("span");
    tokenEl.className = `tok-${cls}`;
    tokenEl.textContent = text;
    lineEl.appendChild(tokenEl);
  }

  return lineEl;
};

export const renderCodeSample = (): void => {
  const keyMode = currentKeyMode();
  const { checked: checkInputElements } = getElement<HTMLInputElement>(
    "#check-input-elements-toggle",
  );

  codeSampleEl.replaceChildren(
    ...codeSampleLines(keyMode, checkInputElements).map(renderCodeLine),
  );
};

copyCodeButton.addEventListener("click", () => {
  void copyTextFrom(codeSampleEl, copyCodeButton);
});

import type { KeyMode } from "../src/types";
import { getElement, wireSegmentedToggle } from "./dom";
import { copyTextFrom } from "./copy-to-clipboard";
import { currentKeyMode } from "./keyboard-view";
import { type CodeToken, renderCodeLine, tokenizeSource } from "./code-tokens";
import {
  type Framework,
  FRAMEWORK_FILENAMES,
  FRAMEWORKS,
  type Language,
  LANGUAGES,
  STATIC_FRAMEWORK_EXAMPLES,
} from "./framework-examples";

const isFramework = (value: string | undefined): value is Framework =>
  (FRAMEWORKS as readonly string[]).includes(value ?? "");

const isLanguage = (value: string | undefined): value is Language =>
  (LANGUAGES as readonly string[]).includes(value ?? "");

// --- Live code sample --------------------------------------------------------
// The "Vanilla" tab mirrors the currently selected keyMode/
// checkInputElements settings into a copy-pasteable snippet, so the sample
// the viewer copies always matches what they're actually seeing the demo
// do. "cmdOrCtrl+k" is a neutral placeholder — it isn't bound to anything
// real on this page, unlike the demo's own bindings — that also doubles as
// a demonstration of the cmdOrCtrl alias itself (Cmd on Mac, Ctrl
// elsewhere). The React/Vue/Svelte tabs are static reference snippets (see
// framework-examples.ts): they don't reflect those toggles, since they're
// about *where* to put the code, not about demonstrating every option.

const codeSampleEl = getElement<HTMLElement>("#code-sample-text");
const copyCodeButton = getElement<HTMLButtonElement>("#copy-code");
const filenameEl = getElement<HTMLElement>("#code-sample-filename");

const vanillaLines = (
  keyMode: KeyMode,
  checkInputElements: boolean,
  language: Language,
): CodeToken[][] => {
  // The one deliberate difference between the TS and JS versions of this
  // particular snippet — there's no type annotation left to drop otherwise,
  // since the rest of this code is already plain, un-annotated JS.
  const eventParam =
    language === "ts" ? "(event: KeyboardEvent) => {" : "(event) => {";

  return [
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
      { text: ", " },
      { text: eventParam },
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
};

let currentFramework: Framework = "vanilla";
let currentLanguage: Language = "ts";

export const renderCodeSample = (): void => {
  const lines: CodeToken[][] =
    currentFramework === "vanilla"
      ? vanillaLines(
          currentKeyMode(),
          getElement<HTMLInputElement>("#check-input-elements-toggle").checked,
          currentLanguage,
        )
      : tokenizeSource(
          STATIC_FRAMEWORK_EXAMPLES[currentFramework][currentLanguage],
        );

  codeSampleEl.replaceChildren(...lines.map(renderCodeLine));
  const { [currentFramework]: filenamesByLanguage } = FRAMEWORK_FILENAMES;
  const { [currentLanguage]: filename } = filenamesByLanguage;
  filenameEl.textContent = filename;
};

copyCodeButton.addEventListener("click", () => {
  void copyTextFrom(codeSampleEl, copyCodeButton);
});

// --- Framework / language tabs ------------------------------------------------
// Independent of the keyMode/checkInputElements toggles above — switching
// tabs here never touches the BindKeyboard instance, it only changes which
// snippet is shown.

wireSegmentedToggle("#framework-toggle", () => {
  const {
    dataset: { value },
  } = getElement<HTMLButtonElement>("#framework-toggle .active");
  currentFramework = isFramework(value) ? value : "vanilla";
  renderCodeSample();
});

wireSegmentedToggle("#language-toggle", () => {
  const {
    dataset: { value },
  } = getElement<HTMLButtonElement>("#language-toggle .active");
  currentLanguage = isLanguage(value) ? value : "ts";
  renderCodeSample();
});

// Shared entry script for every demo/recipes/*.html page — these are
// long-form static content, not interactive widgets like the main demo, so
// the only behavior they need is the same "Copy" button wiring the main
// demo already has (see copy-to-clipboard.ts), plus the same syntax
// coloring (see code-tokens.ts) — the recipe HTML just writes plain text
// into each numbered code block's <code>, so without this they read fine
// but looked visibly flatter than the rest of the site's code samples.
// One import per recipe HTML file (see vite.demo.config.ts's multi-page
// build.rollupOptions.input) rather than a shared bundle chunk, since each
// page only ever loads its own entry.
import { copyTextFrom } from "../copy-to-clipboard";
import { renderCodeLine, tokenizeSource } from "../code-tokens";

// Only the numbered (multi-line TS/JS) blocks — the terminal-style install
// command is deliberately left as plain text, same as the main demo's own
// "Install" section.
document
  .querySelectorAll<HTMLElement>(".code-window-body--numbered code")
  .forEach((codeEl) => {
    const { textContent: source } = codeEl;
    codeEl.replaceChildren(
      ...tokenizeSource(source).map((tokens) => renderCodeLine(tokens)),
    );
  });

document
  .querySelectorAll<HTMLButtonElement>("[data-copy-target]")
  .forEach((button) => {
    const {
      dataset: { copyTarget },
    } = button;
    if (!copyTarget) return;
    const source = document.getElementById(copyTarget);
    if (!source) return;

    button.addEventListener("click", () => {
      void copyTextFrom(source, button);
    });
  });

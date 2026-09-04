// Shared entry script for every demo/recipes/*.html page — these are
// long-form static content, not interactive widgets like the main demo, so
// the only behavior they need is the same "Copy" button wiring the main
// demo already has (see copy-to-clipboard.ts). One import per recipe HTML
// file (see vite.demo.config.ts's multi-page build.rollupOptions.input)
// rather than a shared bundle chunk, since each page only ever loads its
// own entry.
import { copyTextFrom } from "../copy-to-clipboard";

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

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Separate from vite.config.ts (which builds the published library in
// `build.lib` mode) — this is an ordinary app build for the public demo
// page, output to `public/` at the repo root, which is what
// actions/upload-pages-artifact (see .github/workflows/pages.yml) expects
// to find. `base` is "/" rather than "/bind-keyboard/" because Pages is
// configured with a custom domain of its own
// (https://bind-keyboard.vladislav-pavlikov.ru/), which serves from the
// domain root — a plain *.github.io project-page URL would need
// "/bind-keyboard/" instead, since it has no subdomain of its own to
// dedicate to just this one repo.
export default defineConfig({
  base: "/",
  root: "demo",
  server: {
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "../public",
    emptyOutDir: true,
    // Multi-page build: the main demo plus every SEO recipe page under
    // demo/recipes/ (real, individually-indexable HTML pages — see each
    // recipe's own <title>/description/canonical — rather than one big
    // page or client-side-routed sections that would need JS to crawl).
    // Vite's default (a single demo/index.html entry) only covers the
    // first of these.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./demo/index.html", import.meta.url)),
        recipesIndex: fileURLToPath(
          new URL("./demo/recipes/index.html", import.meta.url),
        ),
        reactHook: fileURLToPath(
          new URL("./demo/recipes/react-hook.html", import.meta.url),
        ),
        nextjsSsr: fileURLToPath(
          new URL("./demo/recipes/nextjs-ssr.html", import.meta.url),
        ),
        commandPalette: fileURLToPath(
          new URL("./demo/recipes/command-palette.html", import.meta.url),
        ),
        modalShortcuts: fileURLToPath(
          new URL("./demo/recipes/modal-shortcuts.html", import.meta.url),
        ),
        vimGmailSequences: fileURLToPath(
          new URL("./demo/recipes/vim-gmail-sequences.html", import.meta.url),
        ),
        migratingFromMousetrapHotkeysJs: fileURLToPath(
          new URL(
            "./demo/recipes/migrating-from-mousetrap-hotkeys-js.html",
            import.meta.url,
          ),
        ),
      },
    },
  },
});

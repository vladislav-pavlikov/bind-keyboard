import { defineConfig } from "vite";

// Separate from vite.config.ts (which builds the published library in
// `build.lib` mode) — this is an ordinary app build for the public demo
// page, output to `public/` at the repo root, which is what
// actions/upload-pages-artifact (see .github/workflows/pages.yml) expects
// to find. `base` matches the GitHub Pages project-page URL
// (https://fameowner.github.io/bind-keyboard/), not the domain root —
// without it, built asset URLs would 404 once actually deployed.
export default defineConfig({
  base: "/bind-keyboard/",
  root: "demo",
  server: {
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
});

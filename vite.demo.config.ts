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
  },
});

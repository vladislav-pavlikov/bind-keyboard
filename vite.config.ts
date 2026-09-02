import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dts()],
  // Vite's default publicDir ("<root>/public") is, by unhappy coincidence,
  // the exact directory the *demo* build writes its own output into (see
  // vite.demo.config.ts's outDir). Without this, running "demo:build" before
  // "build" in the same checkout gets that entire demo output (index.html,
  // llms.txt, robots.txt, assets/) copied verbatim into dist/ alongside the
  // real bundle — which "files": ["dist"] in package.json would then ship
  // to npm. The library build has no publicDir of its own, so just disable it.
  publicDir: false,
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      name: "bind-keyboard",
      fileName: "bind-keyboard",
    },
    rollupOptions: {
      output: {
        exports: "named",
      },
      treeshake: true, // TODO
    },
  },
});

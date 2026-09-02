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
    // Vite 8's own default minifier (oxc, Rolldown's own) measurably loses
    // to terser for this specific output: ~4.16kB gzip vs ~3.73kB with
    // nothing else changed (the ESM build specifically — the UMD one comes
    // out roughly the same either way). Slower at build time, but this
    // ships once and gets downloaded by everyone who imports the package,
    // so the trade is one-sided in terser's favor here. Verified correct
    // with scripts/check-dist-behavior.mjs, which — unlike the rest of the
    // test suite, which only ever runs against src/ — actually imports and
    // exercises the real, minified dist/ output.
    minify: "terser",
    rollupOptions: {
      output: {
        exports: "named",
      },
      treeshake: true, // TODO
    },
  },
});

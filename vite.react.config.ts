import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// Separate from vite.config.ts (rather than a second entry in the same
// config) deliberately: Rollup's default behavior for multiple entries
// that share a module graph is to extract the shared code into its own
// chunk, so it's only downloaded once if both entries end up on the same
// page — exactly wrong for two *independently consumed* package entry
// points. Tried that first: it left dist/bind-keyboard.js as a ~150-byte
// shim pointing at a hash-named shared chunk instead of a complete,
// standalone bundle, which would have made every previous bundlesize
// measurement (and the "files": ["dist"] contents) meaningless. A wholly
// separate build has no such shared graph to split — this entry ends up
// with its own copy of the core inlined, the one deliberately accepted
// trade-off (a few KB, if an app imports both "bind-keyboard" and
// "bind-keyboard/react", over one truly shared copy).
export default defineConfig({
  plugins: [dts({ outDir: "dist/react" })],
  publicDir: false,
  build: {
    // Runs after vite.config.ts's own build (see package.json's "build"
    // script) — must not wipe out what that already wrote to dist/.
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/react/index.ts"),
      name: "bindKeyboardReact",
      fileName: (format) => (format === "es" ? "react.js" : "react.umd.cjs"),
    },
    rollupOptions: {
      // A consumer always already has their own copy of react — never
      // bundle it (see "peerDependencies" in package.json).
      external: ["react"],
      output: {
        exports: "named",
        // Only meaningful for the (rarely used) UMD build, if ever loaded
        // via a bare <script> tag instead of a bundler — tells Rollup
        // which global "react" would be under in that scenario, instead
        // of warning that it doesn't know.
        globals: {
          react: "React",
        },
      },
    },
  },
});

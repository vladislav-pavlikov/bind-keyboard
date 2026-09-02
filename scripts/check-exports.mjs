// Verifies both consumption paths declared in package.json's "exports" map
// actually resolve and work, exactly as a real consumer would get them —
// resolves the package by its own name (Node's "self-reference" resolution,
// supported since Node 12.16+ for packages with both `name` and `exports`),
// not by hardcoding dist/ file paths. A misconfigured "exports" field is a
// common, otherwise-silent class of publish bug.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { name } = require("../package.json");

let failed = false;

const check = async (label, fn) => {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    failed = true;
    console.error(`✗ ${label}`);
    console.error(error);
  }
};

const assertConstructor = (mod, buildLabel) => {
  const BindKeyboardExport = mod.BindKeyboard ?? mod.default;

  if (typeof BindKeyboardExport !== "function") {
    throw new Error(
      `BindKeyboard is not a constructor on the ${buildLabel} export (got ${typeof BindKeyboardExport})`,
    );
  }
};

await check(
  `require("${name}") resolves via "exports"."require" and exposes BindKeyboard`,
  () => {
    const mod = require(name);
    assertConstructor(mod, "CJS");
  },
);

await check(
  `import("${name}") resolves via "exports"."import" and exposes BindKeyboard`,
  async () => {
    const mod = await import(name);
    assertConstructor(mod, "ESM");
  },
);

if (failed) {
  console.error("\nExports check failed.");
  process.exit(1);
}

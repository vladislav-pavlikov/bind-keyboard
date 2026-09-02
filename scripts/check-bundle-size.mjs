// Zero-dependency replacement for the `bundlesize` package (dropped because
// its `github-build` -> `axios` transitive chain carries known high-severity
// CVEs). Reads the same `"bundlesize"` budget array from package.json and
// compares each file's gzip size against `maxSize`.
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);
const pkg = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf8"),
);

const parseMaxSize = (maxSize) => {
  const match = /^(\d+(?:\.\d+)?)\s*(kb|b)$/i.exec(maxSize.trim());
  if (!match) {
    throw new Error(`Cannot parse maxSize "${maxSize}"`);
  }
  const [, amount, unit] = match;
  return unit.toLowerCase() === "kb"
    ? parseFloat(amount) * 1024
    : parseFloat(amount);
};

let failed = false;

for (const { path: relativePath, maxSize } of pkg.bundlesize ?? []) {
  const filePath = path.join(rootDir, relativePath);
  const fileBuffer = readFileSync(filePath);
  const gzipSize = gzipSync(fileBuffer).length;
  const maxBytes = parseMaxSize(maxSize);
  const withinBudget = gzipSize <= maxBytes;

  if (!withinBudget) failed = true;

  console.log(
    `${withinBudget ? "✓" : "✗"} ${relativePath}: ${(gzipSize / 1024).toFixed(2)} kB gzip (budget: ${maxSize})`,
  );
}

if (failed) {
  console.error("\nBundle size budget exceeded.");
  process.exit(1);
}

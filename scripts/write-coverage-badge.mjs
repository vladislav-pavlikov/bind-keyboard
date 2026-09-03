// Feeds the README's "coverage" badge (a shields.io "endpoint" badge, same
// mechanism as scripts/write-size-badge.mjs — see that file's own comment)
// with a number this repo actually computed itself, rather than a
// third-party coverage service (Codecov et al., its own signup/token,
// another moving part) — published to GitHub Pages alongside the demo on
// every push to main (see .github/workflows/pages.yml).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// bun test --coverage prints a per-file table ending in an "All files" summary
// row, e.g. "All files | 100.00 | 100.00 |" — the same shape
// .github/workflows/test.yml's own coverage step already produces. Bun
// writes this whole table (and the pass/fail summary) to *stderr*, not
// stdout — confirmed directly (execFileSync's plain string return only
// ever carries stdout, which turned out to hold none of it) before relying
// on it; spawnSync is what actually exposes both streams separately.
const { stdout, stderr, status } = spawnSync("bun", ["test", "--coverage"], {
  cwd: rootDir,
  encoding: "utf8",
});
if (status !== 0) {
  throw new Error(
    `\`bun test --coverage\` exited ${status}:\n${stdout}\n${stderr}`,
  );
}

const match = /All files\s*\|\s*[\d.]+\s*\|\s*([\d.]+)/.exec(stderr);
if (!match) {
  throw new Error(
    'Could not find an "All files" coverage summary line in `bun test --coverage` output.',
  );
}
const [, percent] = match;

const percentNumber = Number(percent);
const color =
  percentNumber >= 90 ? "brightgreen" : percentNumber >= 75 ? "yellow" : "red";

writeFileSync(
  path.join(rootDir, "public/coverage-badge.json"),
  JSON.stringify({
    schemaVersion: 1,
    label: "coverage",
    message: `${percent}%`,
    color,
  }),
);

console.log(`✓ public/coverage-badge.json written (${percent}% lines covered)`);

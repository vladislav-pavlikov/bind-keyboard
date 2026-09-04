// Every "~4.5KB gzip" written by hand in the README, the demo page or
// llms.txt is a claim that silently rots the moment the bundle changes —
// and it has rotted before: llms.txt still said "~3KB" long after the real
// figure was 4.5KB, because nothing connected the prose to the build.
//
// This is the same idea as check-bundle-size/check-exports/
// check-dist-behavior: don't ask anyone to remember, just fail the build
// with the exact file:line when a documented number stops matching the
// one dist/ actually produces.
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// The same file the README's gzip badge reports on (see
// scripts/write-size-badge.mjs) — the core ESM bundle, i.e. what "how big
// is this library" means to almost every consumer.
const target = "dist/bind-keyboard.js";
const actualKb =
  gzipSync(readFileSync(path.join(rootDir, target))).length / 1024;

// Claims are written to one decimal place ("4.5"), so compare at that
// precision rather than demanding an exact byte match that would fail on
// every trivial rebuild.
const actualRounded = actualKb.toFixed(1);

// CHANGELOG.md is deliberately absent: its numbers are a historical record
// of what a past release measured, and rewriting them to match today's
// build would falsify it.
const FILES = ["README.md", "demo/index.html", "demo/public/llms.txt"];

// Matches a size stated *about this library* — the word gzip has to be
// adjacent, which is what keeps the comparison table's competitor cells
// ("~2 kB", "~1 kB", "~3.8 kB") out of scope. Their sizes aren't ours to
// verify from our own dist/.
const CLAIM = /(~?)(\d+(?:\.\d+)?)\s*(?:KB|kB|kb)\s*(?:gzip(?:ped)?)/gu;

// The one claim about us that the pattern above can't see, because the
// word "gzip" sits in the row label rather than next to the number.
const TABLE_ROW = /^\|\s*Gzip size\s*\|\s*~?(\d+(?:\.\d+)?)\s*kB/u;

const problems = [];

for (const file of FILES) {
  const contents = readFileSync(path.join(rootDir, file), "utf8");

  contents.split("\n").forEach((line, index) => {
    const lineNumber = index + 1;

    const tableMatch = TABLE_ROW.exec(line);
    if (tableMatch && tableMatch[1] !== actualRounded) {
      problems.push(
        `${file}:${String(lineNumber)} — comparison table says ${tableMatch[1]} kB, dist/ is ${actualRounded} kB`,
      );
    }

    for (const match of line.matchAll(CLAIM)) {
      const [, , claimed] = match;
      if (claimed !== actualRounded) {
        problems.push(
          `${file}:${String(lineNumber)} — claims ${claimed}KB gzip, dist/ is ${actualRounded}KB`,
        );
      }
    }
  });
}

if (problems.length > 0) {
  console.error(
    `Documented gzip size no longer matches ${target} (${actualRounded}KB):\n`,
  );
  problems.forEach((problem) => {
    console.error(`  ✗ ${problem}`);
  });
  console.error(
    "\nUpdate the prose (or the bundle) so the two agree. CHANGELOG.md is exempt — its numbers describe past releases.",
  );
  process.exit(1);
}

console.log(
  `✓ every documented gzip size matches ${target} (${actualRounded}KB)`,
);

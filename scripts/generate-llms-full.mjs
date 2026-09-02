// Generates demo/public/llms-full.txt from README.md — the whole API
// reference inlined into a single file for LLM agents/crawlers that would
// rather fetch everything in one request than follow links. It's the
// companion to the hand-written demo/public/llms.txt (a short index) per
// the https://llmstxt.org/ convention. Regenerated on every demo build
// (see package.json's "demo:dev"/"demo:build" scripts) so it can never
// drift from the README — it's gitignored, never hand-edited.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const readme = readFileSync(`${rootDir}README.md`, "utf8");

// Badges are pure decoration (shields.io images) — meaningless as plain
// text, so they're stripped rather than carried into a file meant to be
// read, not rendered.
const BADGE_LINE = /^\[?!\[.*\]\(.*\)\]?(?:\(.*\))?$/u;

const body = readme
  .split("\n")
  .filter((line) => !BADGE_LINE.test(line))
  .join("\n")
  .replace(/\n{3,}/gu, "\n\n")
  .trim();

const header =
  "<!-- Generated from README.md by scripts/generate-llms-full.mjs — do not edit directly. -->\n\n";

writeFileSync(`${rootDir}demo/public/llms-full.txt`, `${header + body}\n`);
console.log("✓ demo/public/llms-full.txt regenerated from README.md");

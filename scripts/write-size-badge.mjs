// Feeds the README's "gzip size" badge (a shields.io "endpoint" badge —
// https://img.shields.io/endpoint?url=<this file's published URL> — reads
// whatever JSON it finds there) with a number this repo actually computed
// itself, published to GitHub Pages alongside the demo (see
// .github/workflows/pages.yml) rather than depending on a third-party
// bundle analysis service. bundlephobia's own badge was found to be down
// ("rate limited by upstream service") when this was written — this script
// exists so the README's size claim never depends on that kind of uptime
// again, live-updating on every push to main instead of needing a manual
// edit the way a plain static badge would.
import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// The core ESM bundle — what "how big is this library" means to almost
// every consumer (a bundler resolving the "module"/"import" condition).
// The other three tracked bundles (UMD, and the /react entry's own ESM +
// UMD) stay within a few hundred bytes of this one; one representative
// number reads better on a badge than four.
const target = "dist/bind-keyboard.js";
const gzipSize = gzipSync(readFileSync(path.join(rootDir, target))).length;
const kb = (gzipSize / 1024).toFixed(2);

writeFileSync(
  path.join(rootDir, "public/badge-size.json"),
  JSON.stringify({
    schemaVersion: 1,
    label: "gzip",
    message: `${kb} kB`,
    color: "blue",
  }),
);

console.log(`✓ public/badge-size.json written (${kb} kB gzip, from ${target})`);

# Contributing

Thanks for considering a contribution to `bind-keyboard`.

## Setup

This project uses [Bun](https://bun.sh) (CI runs `1.2.18`) for installs, tests, and scripts.

```bash
bun install
```

## Useful scripts

- `npm run dev` — Vite dev server for the library itself (`vite.config.ts`).
- `npm run demo:dev` — the public demo page (`demo/`), served separately from the library build.
- `bun test` / `bun test --coverage` — the test suite (`src/**/*.test.ts`).
- `npm run lint` — ESLint (`eslint-config-love` + Prettier), with `--fix`.
- `npx tsc --noEmit` — typecheck without emitting.
- `npm run build` — builds `dist/` (ESM + UMD, both the core and `/react` entry).
- `npm run bundlesize` — builds, then checks each `dist/*.js`/`.cjs` against the gzip budgets in `package.json`'s `"bundlesize"` field.
- `npm run check-exports` — builds, then verifies `require()`/`import()` both resolve real `dist/` files via `"exports"`.
- `npm run check-dist-behavior` — builds, then runs a handful of end-to-end checks against the actual built ESM and CJS output (not the source), catching bugs a build step could otherwise introduce silently.

A `husky` pre-commit hook runs `lint-staged` on staged files (ESLint `--fix` + Prettier), so most style issues are fixed automatically on commit.

## Before opening a PR

Run the same checks CI runs on every push:

```bash
npm run lint
npx tsc --noEmit
bun test --coverage
npm run build
npm run bundlesize
npm run check-exports
npm run check-dist-behavior
```

All of them need to pass. If you're changing public behavior, add or update tests in `src/index.test.ts`, `src/sequences.test.ts`, or `src/react/useKeybind.test.ts` (whichever matches what you touched) rather than relying on the existing suite to catch it.

## Style notes

- No enforced commit-message convention (no `feat:`/`fix:` prefixes required) — just a clear, descriptive summary of what changed and why, matching the existing history.
- Keep the core library dependency-free (see the `dependencies: 0` badge in the README) — don't add a runtime dependency without discussing it first in an issue.
- `src/` is the published library; `demo/` is the standalone demo page bundled separately (`vite.demo.config.ts`) and never shipped to npm — changes to one don't need to touch the other.

## Reporting bugs / suggesting features

Open a [GitHub issue](https://github.com/vladislav-pavlikov/bind-keyboard/issues). For security vulnerabilities, see [SECURITY.md](./SECURITY.md) instead — please don't file those as public issues.

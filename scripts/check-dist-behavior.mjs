// Everything else in this project's verification pipeline runs against
// src/ (bun test) or only checks that the built dist/ files *resolve* and
// expose the right shape (check-exports.mjs) — nothing actually exercises
// the real, minified output's *behavior*. That gap matters most exactly
// when something about the build itself changes (a new minifier, a new
// bundler version, a new build target) rather than the source — the kind
// of regression neither of those two checks would ever catch. This script
// imports the real dist/ files (both ESM and CJS) and drives a handful of
// behaviorally load-bearing scenarios through them directly.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

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

const press = (type, init) =>
  document.dispatchEvent(new KeyboardEvent(type, { bubbles: true, ...init }));

// Scenarios exercised against whichever BindKeyboard constructor is
// passed in — run once against the ESM import, once against the CJS
// require(), so a minifier/bundler quirk specific to either output
// format gets caught either way.
const runScenarios = async (BindKeyboard, label) => {
  await check(`${label}: fires a plain combo`, () => {
    const bk = new BindKeyboard();
    let called = false;
    bk.add("ctrl+a", () => (called = true), true, "keypress");
    press("keypress", { key: "a", ctrlKey: true });
    bk.destroy();
    if (!called) throw new Error("callback did not fire");
  });

  await check(`${label}: keyMode "code" matches by physical key`, () => {
    const bk = new BindKeyboard({ keyMode: "code" });
    let called = false;
    bk.add("ctrl+a", () => (called = true), true, "keydown");
    // A non-Latin layout's "a" position still reports code: "KeyA".
    press("keydown", { key: "ф", code: "KeyA", ctrlKey: true });
    bk.destroy();
    if (!called)
      throw new Error("callback did not fire for a non-Latin layout key");
  });

  await check(`${label}: cmdOrCtrl resolves on this (non-Mac) platform`, () => {
    const bk = new BindKeyboard();
    let called = false;
    bk.add("cmdOrCtrl+k", () => (called = true), true, "keydown");
    press("keydown", { key: "k", ctrlKey: true });
    bk.destroy();
    if (!called) throw new Error("cmdOrCtrl+k did not fire on ctrlKey");
  });

  await check(
    `${label}: a scoped binding only fires once its scope is active`,
    () => {
      const bk = new BindKeyboard();
      let called = false;
      bk.add("ctrl+k", () => (called = true), true, "keydown", {
        scope: "modal",
      });
      press("keydown", { key: "k", ctrlKey: true });
      if (called) throw new Error("fired while scope inactive");
      bk.enableScope("modal");
      press("keydown", { key: "k", ctrlKey: true });
      bk.destroy();
      if (!called) throw new Error("did not fire once scope was enabled");
    },
  );

  await check(
    `${label}: a sequence fires once every step is pressed in order`,
    () => {
      const bk = new BindKeyboard();
      let called = false;
      bk.add("g,o", () => (called = true), true, "keydown");
      press("keydown", { key: "g", code: "KeyG" });
      if (called) throw new Error("fired after only the first step");
      press("keydown", { key: "o", code: "KeyO" });
      bk.destroy();
      if (!called) throw new Error("did not fire once both steps were pressed");
    },
  );

  await check(
    `${label}: checkInputElements suppresses while an input is focused`,
    () => {
      const bk = new BindKeyboard();
      let called = false;
      bk.add("ctrl+a", () => (called = true), true, "keydown");
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      press("keydown", { key: "a", ctrlKey: true });
      input.remove();
      bk.destroy();
      if (called) throw new Error("fired while an input was focused");
    },
  );

  await check(
    `${label}: holding a key then also pressing a modifier resolves immediately`,
    () => {
      const bk = new BindKeyboard({ keyMode: "code" });
      let called = false;
      bk.add("shift+d", () => (called = true), true, "keydown");
      press("keydown", { code: "KeyD", key: "d", repeat: false });
      press("keydown", { code: "KeyD", key: "d", repeat: true });
      press("keydown", {
        code: "KeyD",
        key: "d",
        shiftKey: true,
        repeat: true,
      });
      bk.destroy();
      if (!called) {
        throw new Error(
          "shift+d did not resolve on the modifier-carrying repeat of the held key",
        );
      }
    },
  );
};

const { default: EsmBindKeyboard } = await import(name);
await runScenarios(EsmBindKeyboard, "ESM");

const CjsBindKeyboard = require(name);
await runScenarios(CjsBindKeyboard.default ?? CjsBindKeyboard, "CJS");

if (failed) {
  console.error("\ndist/ behavior check failed.");
  process.exit(1);
}

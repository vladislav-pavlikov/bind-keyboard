// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- bun-types/test-globals has no runtime exports, so it can only be pulled in as an ambient type reference, not an import.
/// <reference types="bun-types/test-globals" />
import { setTimeout as sleep } from "node:timers/promises";
import BindKeyboard from "./";
import { KeybindError } from "./classes";

// Split out of index.test.ts once that file hit ESLint's max-lines (700) —
// sequences/chords are a big enough, self-contained feature to carry their
// own file rather than trimming coverage to fit a line budget.
describe("Sequences", () => {
  it("should fire a sequence's callback once every step is pressed in order", () => {
    const sequenced = new BindKeyboard();
    const callback = jest.fn();
    sequenced.add("g,o", callback, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(callback).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(callback).toHaveBeenCalledTimes(1);

    sequenced.destroy();
  });

  it("should reset a sequence's progress when the wrong next step is pressed", () => {
    const sequenced = new BindKeyboard();
    const callback = jest.fn();
    sequenced.add("g,o", callback, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "x", code: "KeyX" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(callback).not.toHaveBeenCalled();

    // A fresh "g,o" after the reset still works.
    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(callback).toHaveBeenCalledTimes(1);

    sequenced.destroy();
  });

  it("should abandon a sequence's progress after sequenceTimeout ms of inactivity", async () => {
    const sequenced = new BindKeyboard({ sequenceTimeout: 30 });
    const callback = jest.fn();
    sequenced.add("g,o", callback, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    await sleep(60);
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));

    expect(callback).not.toHaveBeenCalled();

    sequenced.destroy();
  });

  it("should not let a bare modifier press between two steps reset a sequence's progress", () => {
    const sequenced = new BindKeyboard();
    const callback = jest.fn();
    sequenced.add("g,o", callback, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "Shift", code: "ShiftLeft" }),
    );
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));

    expect(callback).toHaveBeenCalledTimes(1);

    sequenced.destroy();
  });

  it("should not let a held key's own auto-repeat complete a same-key sequence", () => {
    const sequenced = new BindKeyboard();
    const callback = jest.fn();
    sequenced.add("g,g", callback, true, "keydown");

    // A single physical press held down: one real keydown, then the OS
    // auto-repeating that same key — must not be mistaken for "g" pressed
    // twice in a row.
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "g", code: "KeyG", repeat: false }),
    );
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "g", code: "KeyG", repeat: true }),
    );
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "g", code: "KeyG", repeat: true }),
    );
    expect(callback).not.toHaveBeenCalled();

    // Release and press it again for real — now it completes.
    dispatchEvent(new KeyboardEvent("keyup", { key: "g", code: "KeyG" }));
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "g", code: "KeyG", repeat: false }),
    );
    expect(callback).toHaveBeenCalledTimes(1);

    sequenced.destroy();
  });

  it("should not treat a literal comma key as a sequence separator", () => {
    const commaBound = new BindKeyboard({ keyMode: "code" });
    const callback = jest.fn();
    commaBound.add("ctrl+,", callback, true, "keydown");

    dispatchEvent(
      new KeyboardEvent("keydown", {
        key: ",",
        code: "Comma",
        ctrlKey: true,
      }),
    );

    expect(callback).toHaveBeenCalledTimes(1);

    commaBound.destroy();
  });

  it("should correctly parse and fire a sequence whose own step is a literal comma key", () => {
    const sequenced = new BindKeyboard({ keyMode: "code" });
    const callback = jest.fn();
    sequenced.add("ctrl+,,g", callback, true, "keydown");

    dispatchEvent(
      new KeyboardEvent("keydown", { key: ",", code: "Comma", ctrlKey: true }),
    );
    expect(callback).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(callback).toHaveBeenCalledTimes(1);

    sequenced.destroy();
  });

  it("should throw KeybindError for a sequence with an empty step", () => {
    const sequenced = new BindKeyboard();

    expect(() => sequenced.add("g,,o", jest.fn())).toThrow(KeybindError);
    expect(() => sequenced.add("g,", jest.fn())).toThrow(KeybindError);

    sequenced.destroy();
  });

  it("should not fire either sequence when they conflict (one completes while another, sharing its prefix, is still pending)", () => {
    const sequenced = new BindKeyboard({ debug: 1 });
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally silences console.warn noise for this test.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const shortCallback = jest.fn();
    const longCallback = jest.fn();
    sequenced.add("g,o", shortCallback, true, "keydown");
    sequenced.add("g,o,x", longCallback, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));

    // "g,o" completed on the same press that "g,o,x" is still pending on —
    // neither fires.
    expect(shortCallback).not.toHaveBeenCalled();
    expect(longCallback).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    // "g,o,x" alone is no longer ambiguous once "g,o" has reset — it fires.
    dispatchEvent(new KeyboardEvent("keydown", { key: "x", code: "KeyX" }));
    expect(longCallback).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    sequenced.destroy();
  });

  it("should register both a plain binding and a sequence from one mixed array", () => {
    const sequenced = new BindKeyboard();
    const plainCallback = jest.fn();
    const sequenceCallback = jest.fn();
    sequenced.add(["ctrl+a", "g,o"], (ev) => {
      if (ev.ctrlKey) plainCallback();
      else sequenceCallback();
    });

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(plainCallback).toHaveBeenCalledTimes(1);

    sequenced.add("g,o", sequenceCallback, true, "keydown");
    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(sequenceCallback).toHaveBeenCalledTimes(1);

    sequenced.destroy();
  });

  it("should respect checkInputElements/allowInInputElements and scope for a completed sequence", () => {
    const sequenced = new BindKeyboard();
    const guardedCallback = jest.fn();
    const scopedCallback = jest.fn();
    sequenced.add("g,o", guardedCallback, true, "keydown");
    sequenced.add("j,k", scopedCallback, true, "keydown", { scope: "vim" });

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(guardedCallback).not.toHaveBeenCalled();

    input.remove();

    dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK" }));
    expect(scopedCallback).not.toHaveBeenCalled();

    sequenced.enableScope("vim");
    dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "k", code: "KeyK" }));
    expect(scopedCallback).toHaveBeenCalledTimes(1);

    sequenced.destroy();
  });

  it("should look up, remove, and list a sequence via getKeybind/remove/getAllBindings", () => {
    const sequenced = new BindKeyboard();
    sequenced.add("g,o", jest.fn(), true, "keydown", {
      description: "Go to file",
    });

    const entry = sequenced.getKeybind("g,o", "keydown");
    expect(entry?.keyCombination).toBe("g, o");
    expect(entry?.description).toBe("Go to file");
    expect(
      sequenced.getAllBindings().some((b) => b.keyCombination === "g, o"),
    ).toBe(true);

    expect(sequenced.remove("g,o", "keydown")).toBe(true);
    expect(sequenced.getKeybind("g,o", "keydown")).not.toBeDefined();

    sequenced.destroy();
  });

  it("without deferForSequence, a plain binding still fires immediately even though a same-prefix sequence is registered", () => {
    const bk = new BindKeyboard();
    const plain = jest.fn();
    const sequence = jest.fn();
    bk.add("g", plain, true, "keydown");
    bk.add("g,o", sequence, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(plain).toHaveBeenCalledTimes(1);

    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(sequence).toHaveBeenCalledTimes(1);

    bk.destroy();
  });

  it("with deferForSequence, a plain binding does not fire while a same-prefix sequence completes instead", () => {
    const bk = new BindKeyboard();
    const plain = jest.fn();
    const sequence = jest.fn();
    bk.add("g", plain, true, "keydown", { deferForSequence: true });
    bk.add("g,o", sequence, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(plain).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(sequence).toHaveBeenCalledTimes(1);
    expect(plain).not.toHaveBeenCalled();

    bk.destroy();
  });

  it("with deferForSequence, a plain binding fires as soon as the sequence attempt breaks, without waiting out the full timeout", () => {
    const bk = new BindKeyboard({ sequenceTimeout: 10_000 });
    const plain = jest.fn();
    const sequence = jest.fn();
    bk.add("g", plain, true, "keydown", { deferForSequence: true });
    bk.add("g,o", sequence, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(plain).not.toHaveBeenCalled();

    // Wrong next key — the sequence attempt breaks. deferForSequence's
    // whole point is not making every deferred key eat a full
    // sequenceTimeout of latency once it's no longer ambiguous, so this
    // must fire right away rather than only after the (deliberately huge)
    // 10s timeout above.
    dispatchEvent(new KeyboardEvent("keydown", { key: "x", code: "KeyX" }));
    expect(plain).toHaveBeenCalledTimes(1);
    expect(sequence).not.toHaveBeenCalled();

    bk.destroy();
  });

  it("with deferForSequence, a plain binding fires after sequenceTimeout if nothing else happens at all", async () => {
    const bk = new BindKeyboard({ sequenceTimeout: 30 });
    const plain = jest.fn();
    bk.add("g", plain, true, "keydown", { deferForSequence: true });
    bk.add("g,o", jest.fn(), true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(plain).not.toHaveBeenCalled();

    await sleep(60);
    expect(plain).toHaveBeenCalledTimes(1);

    bk.destroy();
  });

  it("with deferForSequence, a held key's own auto-repeat neither fires early nor breaks the deferral", () => {
    const bk = new BindKeyboard({ sequenceTimeout: 10_000 });
    const plain = jest.fn();
    const sequence = jest.fn();
    bk.add("g", plain, true, "keydown", { deferForSequence: true });
    bk.add("g,o", sequence, true, "keydown");

    dispatchEvent(
      new KeyboardEvent("keydown", { key: "g", code: "KeyG", repeat: false }),
    );
    expect(plain).not.toHaveBeenCalled();

    dispatchEvent(
      new KeyboardEvent("keydown", { key: "g", code: "KeyG", repeat: true }),
    );
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "g", code: "KeyG", repeat: true }),
    );
    expect(plain).not.toHaveBeenCalled();
    expect(sequence).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(sequence).toHaveBeenCalledTimes(1);
    expect(plain).not.toHaveBeenCalled();

    bk.destroy();
  });

  it("documents a deliberate scope limit: deferForSequence only guards the sequence's *first* step, so a same-key sequence's own completing press still also fires the plain binding", () => {
    // deferForSequence exists to stop a plain binding firing on the press
    // that *starts* a same-prefix sequence (see the tests above) — it does
    // not track every later step too, so it can't also catch the much
    // narrower case of a same-key sequence like "g,g" whose *last* press
    // is physically the same keystroke as its first. That would need
    // tracking every in-progress sequence's remaining steps, not just
    // whether this key starts one — real complexity for a deliberately
    // simple, opt-in escape hatch. Documented here as a known boundary,
    // not silently left for someone to trip over.
    const bk = new BindKeyboard({ sequenceTimeout: 10_000 });
    const plain = jest.fn();
    const sequence = jest.fn();
    bk.add("g", plain, true, "keydown", { deferForSequence: true });
    bk.add("g,g", sequence, true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(plain).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keyup", { key: "g", code: "KeyG" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(sequence).toHaveBeenCalledTimes(1);
    expect(plain).toHaveBeenCalledTimes(1);

    bk.destroy();
  });

  it("with deferForSequence, a second deferred press flushes (fires) the first rather than dropping it", () => {
    const bk = new BindKeyboard({ sequenceTimeout: 10_000 });
    const gCallback = jest.fn();
    const hCallback = jest.fn();
    bk.add("g", gCallback, true, "keydown", { deferForSequence: true });
    bk.add("g,o", jest.fn(), true, "keydown");
    bk.add("h", hCallback, true, "keydown", { deferForSequence: true });
    bk.add("h,i", jest.fn(), true, "keydown");

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    expect(gCallback).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keydown", { key: "h", code: "KeyH" }));
    expect(gCallback).toHaveBeenCalledTimes(1);
    expect(hCallback).not.toHaveBeenCalled();

    bk.destroy();
  });

  it("warns (under debug) and has no effect when deferForSequence is set on a sequence itself", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally silences console.warn noise for this test.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const bk = new BindKeyboard({ debug: 1 });
    const callback = jest.fn();
    bk.add("g,o", callback, true, "keydown", { deferForSequence: true });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("has no effect"),
    );

    dispatchEvent(new KeyboardEvent("keydown", { key: "g", code: "KeyG" }));
    dispatchEvent(new KeyboardEvent("keydown", { key: "o", code: "KeyO" }));
    expect(callback).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    bk.destroy();
  });
});

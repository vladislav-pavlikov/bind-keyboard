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
});

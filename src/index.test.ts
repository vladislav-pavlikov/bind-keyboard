// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- bun-types/test-globals has no runtime exports, so it can only be pulled in as an ambient type reference, not an import.
/// <reference types="bun-types/test-globals" />
import BindKeyboard from "./";
import { KeybindError } from "./classes";

const bindKeyboard = new BindKeyboard();

describe("Keybind Library Tests", () => {
  beforeEach(() => {
    bindKeyboard.removeAll();
  });

  it("window is defined", () => {
    expect(window).toBeDefined();
  });

  it("should add key binding and find it by .getKeybind", () => {
    const callback = jest.fn();
    bindKeyboard.add("ctrl+A", callback);

    expect(bindKeyboard.getKeybind("Ctrl+A")).toEqual({
      keyCombination: "ctrl + a",
      callback,
      eventType: "keypress",
      preventRepeat: true,
      allowInInputElements: false,
    });
  });

  it('should not find deleted "Ctrl+A" binding by .getKeybind', () => {
    expect(bindKeyboard.getKeybind("Ctrl+A")).not.toBeDefined();
  });

  it("should add and trigger key binding", () => {
    const callback = jest.fn();
    bindKeyboard.add("ctrl+a", callback);

    const event = new KeyboardEvent("keypress", { key: "a", ctrlKey: true });
    dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
  });

  it("should rewrite key binding on same keyCombination by default", () => {
    const callbackNotToHaveBeenCalled = jest.fn();
    const callbackToHaveBeenCalled = jest.fn();
    bindKeyboard.add("ctrl+a", callbackNotToHaveBeenCalled);
    bindKeyboard.add("ctrl+a", callbackToHaveBeenCalled);

    const event = new KeyboardEvent("keypress", { key: "a", ctrlKey: true });
    dispatchEvent(event);

    expect(callbackNotToHaveBeenCalled).not.toHaveBeenCalled();
    expect(callbackToHaveBeenCalled).toHaveBeenCalled();
  });

  it("should throw when re-adding an existing combination with override: false", () => {
    bindKeyboard.add("ctrl+a", jest.fn());

    expect(() =>
      bindKeyboard.add("ctrl+a", jest.fn(), true, "keypress", {
        override: false,
      }),
    ).toThrow(KeybindError);
  });

  it("should not leave partial bindings when add() throws on an array with override: false", () => {
    bindKeyboard.add("ctrl+b", jest.fn());
    expect(() =>
      bindKeyboard.add(["ctrl+a", "ctrl+b"], jest.fn(), true, "keypress", {
        override: false,
      }),
    ).toThrow(KeybindError);

    expect(bindKeyboard.getKeybind("ctrl+a")).not.toBeDefined();
  });

  it("should throw on a duplicate combination within the same array when override: false", () => {
    expect(() =>
      bindKeyboard.add(["ctrl+z", "ctrl+z"], jest.fn(), true, "keypress", {
        override: false,
      }),
    ).toThrow(KeybindError);

    expect(bindKeyboard.getKeybind("ctrl+z")).not.toBeDefined();
  });

  it("should not trigger key binding when key combination does not match", () => {
    const callback = jest.fn();
    bindKeyboard.add({ key: "a", ctrlKey: true }, callback, true, "keydown");

    const event = new KeyboardEvent("keydown", { key: "a" });
    dispatchEvent(event);

    expect(callback).not.toHaveBeenCalled();
  });

  it("should remove key binding", () => {
    const callback = jest.fn();
    bindKeyboard.add("ctrl+A", callback);
    bindKeyboard.remove("ctrl+A");

    const event = new KeyboardEvent("keypress", { key: "a", ctrlKey: true });
    document.dispatchEvent(event);

    expect(bindKeyboard.getKeybind("ctrl+A")).not.toBeDefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it("should match by code when keyMode is code", () => {
    const bindKeyboardCode = new BindKeyboard({ keyMode: "code" });
    const callback = jest.fn();
    bindKeyboardCode.add("ctrl+a", callback, true, "keydown");

    const event = new KeyboardEvent("keydown", {
      key: "ф",
      code: "KeyA",
      ctrlKey: true,
    });
    dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
    bindKeyboardCode.stopListeners();
  });

  it("should match a punctuation key combination added as a string when keyMode is code", () => {
    const bindKeyboardCode = new BindKeyboard({ keyMode: "code" });
    const callback = jest.fn();
    bindKeyboardCode.add("ctrl+,", callback, true, "keydown");

    const event = new KeyboardEvent("keydown", {
      key: ",",
      code: "Comma",
      ctrlKey: true,
    });
    dispatchEvent(event);

    expect(callback).toHaveBeenCalled();
    bindKeyboardCode.stopListeners();
  });

  it("should bind the same callback to an array of key combinations", () => {
    const callback = jest.fn();
    const entries = bindKeyboard.add(["ctrl+a", "ctrl+b"], callback);

    expect(entries).toHaveLength(2);

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    dispatchEvent(new KeyboardEvent("keypress", { key: "b", ctrlKey: true }));

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should store an optional description on the binding entry", () => {
    bindKeyboard.add("ctrl+a", jest.fn(), true, "keypress", {
      description: "Select all",
    });

    expect(bindKeyboard.getKeybind("ctrl+a")?.description).toBe("Select all");
  });

  it("should stop listening and clear bindings on .destroy()", () => {
    const callback = jest.fn();
    const destroyable = new BindKeyboard();
    destroyable.add("ctrl+a", callback);

    destroyable.destroy();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));

    expect(callback).not.toHaveBeenCalled();
    expect(destroyable.getAllBindings()).toHaveLength(0);
  });

  it("should not intercept keys while a contenteditable element is focused", () => {
    const guarded = new BindKeyboard({ checkInputElements: true });
    const callback = jest.fn();
    guarded.add("ctrl+a", callback);

    const editableDiv = document.createElement("div");
    editableDiv.contentEditable = "true";
    document.body.appendChild(editableDiv);
    editableDiv.focus();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(callback).not.toHaveBeenCalled();

    editableDiv.remove();
    guarded.destroy();
  });

  it("should still trigger a binding marked allowInInputElements while an input is focused", () => {
    const guarded = new BindKeyboard({ checkInputElements: true });
    const callback = jest.fn();
    guarded.add("escape", callback, true, "keydown", {
      allowInInputElements: true,
    });

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(callback).toHaveBeenCalled();

    input.remove();
    guarded.destroy();
  });

  it("should skip autostart instead of throwing when the target cannot listen", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally silences console.warn noise for this test.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- deliberately building a target that lacks addEventListener, to exercise the SSR guard.
    const fakeTarget = {} as unknown as EventTarget;

    expect(() => new BindKeyboard({ target: fakeTarget })).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

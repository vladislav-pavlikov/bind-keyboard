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
      deferForSequence: false,
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

  it("should trigger a lone-modifier binding on a real standalone press of that modifier, in both keyMode key and code", () => {
    for (const keyMode of ["key", "code"] as const) {
      const bindKeyboard = new BindKeyboard({ keyMode });
      const callback = jest.fn();
      bindKeyboard.add("ctrl", callback, true, "keydown");

      // A real standalone Ctrl press carries event.key === "Control" and
      // event.code === "ControlLeft"/"ControlRight" alongside ctrlKey: true —
      // both must collapse into plain "ctrl", not "ctrl + control"/
      // "ctrl + controlleft", or this binding would never fire.
      dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Control",
          code: "ControlLeft",
          ctrlKey: true,
        }),
      );

      expect(callback).toHaveBeenCalled();
      bindKeyboard.stopListeners();
    }
  });

  it("should correctly parse and fire a binding for the literal + key, alone or after modifiers", () => {
    // "+" is the modifier/key separator everywhere else in this syntax, so
    // a naive split("+") silently loses it as the base key — "ctrl++" used
    // to parse as bare "ctrl" instead of Ctrl+Plus. Regression test for a
    // real gap found via hotkeys-js's "+ (plus) don't work on mac" issue
    // and mousetrap's own "binding plus key alone should work"/"binding to
    // alt++ should work"/"binding to alt+shift++ should work as well" tests.
    const bindKeyboard = new BindKeyboard();

    const lonePlus = jest.fn();
    bindKeyboard.add("+", lonePlus, true, "keydown");
    dispatchEvent(new KeyboardEvent("keydown", { key: "+" }));
    expect(lonePlus).toHaveBeenCalled();

    const altPlus = jest.fn();
    bindKeyboard.add("alt++", altPlus, true, "keydown");
    dispatchEvent(new KeyboardEvent("keydown", { key: "+", altKey: true }));
    expect(altPlus).toHaveBeenCalled();

    const altShiftPlus = jest.fn();
    bindKeyboard.add("alt+shift++", altShiftPlus, true, "keydown");
    dispatchEvent(
      new KeyboardEvent("keydown", { key: "+", altKey: true, shiftKey: true }),
    );
    expect(altShiftPlus).toHaveBeenCalled();

    bindKeyboard.destroy();
  });

  it("should fire a binding whose combination first arises from a modifier changing mid-hold, even though the underlying key is auto-repeating", () => {
    const bindKeyboardCode = new BindKeyboard({ keyMode: "code" });
    const move = jest.fn();
    const dash = jest.fn();
    bindKeyboardCode.add("d", move, true, "keydown");
    bindKeyboardCode.add("shift+d", dash, true, "keydown");

    // Press and hold "d" — fires once, then auto-repeats are suppressed.
    dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyD", key: "d", repeat: false }),
    );
    dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyD", key: "d", repeat: true }),
    );
    expect(move).toHaveBeenCalledTimes(1);

    // Shift is now *also* held — "d"'s next OS auto-repeat carries
    // shiftKey: true, genuinely resolving to "shift + d" for the first
    // time. event.repeat is still true (the OS is repeating the "d" key,
    // regardless of Shift's involvement), but this must still fire: it's
    // not a repeat of a combination that has already fired.
    dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyD",
        key: "d",
        shiftKey: true,
        repeat: true,
      }),
    );
    expect(dash).toHaveBeenCalledTimes(1);

    // Further auto-repeats of "shift + d" itself should still be
    // suppressed, same as any other held combination.
    dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyD",
        key: "d",
        shiftKey: true,
        repeat: true,
      }),
    );
    expect(dash).toHaveBeenCalledTimes(1);

    bindKeyboardCode.stopListeners();
  });

  it("should fire a held key's new combination immediately on the modifier's own keydown, not only via that key's auto-repeat", () => {
    // Real browsers aren't guaranteed to keep updating a repeating key's
    // own modifier flags once another key is also pressed — this is the
    // reliable path: the modifier key's own (fresh, non-repeat) keydown
    // carries the correct combination on its own, using whatever
    // non-modifier key is currently held.
    const bindKeyboardCode = new BindKeyboard({ keyMode: "code" });
    const move = jest.fn();
    const dash = jest.fn();
    bindKeyboardCode.add("d", move, true, "keydown");
    bindKeyboardCode.add("shift+d", dash, true, "keydown");

    dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyD", key: "d", repeat: false }),
    );
    expect(move).toHaveBeenCalledTimes(1);

    // Shift's own fresh keydown — no further "d" event involved at all.
    dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "ShiftLeft",
        key: "Shift",
        shiftKey: true,
        repeat: false,
      }),
    );
    expect(dash).toHaveBeenCalledTimes(1);

    // Shift auto-repeating shouldn't re-dash.
    dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "ShiftLeft",
        key: "Shift",
        shiftKey: true,
        repeat: true,
      }),
    );
    expect(dash).toHaveBeenCalledTimes(1);

    // Releasing Shift while "d" is still held, then re-pressing Shift,
    // should dash again — the held key is still tracked correctly.
    dispatchEvent(
      new KeyboardEvent("keyup", {
        code: "ShiftLeft",
        key: "Shift",
        shiftKey: false,
      }),
    );
    dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "ShiftLeft",
        key: "Shift",
        shiftKey: true,
        repeat: false,
      }),
    );
    expect(dash).toHaveBeenCalledTimes(2);

    // Releasing "d" itself clears the held key — Shift alone afterward
    // shouldn't still resolve to "shift + d".
    dispatchEvent(
      new KeyboardEvent("keyup", { code: "KeyD", key: "d", shiftKey: true }),
    );
    dispatchEvent(
      new KeyboardEvent("keyup", {
        code: "ShiftLeft",
        key: "Shift",
        shiftKey: false,
      }),
    );
    dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "ShiftLeft",
        key: "Shift",
        shiftKey: true,
        repeat: false,
      }),
    );
    expect(dash).toHaveBeenCalledTimes(2);

    bindKeyboardCode.stopListeners();
  });

  it('should fire a "keyup" binding for a held key on release even while an unrelated modifier is also still held', () => {
    // A common continuous-movement pattern: "d" held to move, paired with a
    // "shift+d" keydown dash *while still holding d*. Releasing "d" first
    // (dash then release, without releasing Shift first) carries
    // shiftKey: true on that very keyup — if keyup required an exact
    // modifier match, a plain "d" keyup binding would never fire in that
    // case, leaving whatever state it was supposed to reset (e.g. "is d
    // held") stuck.
    const bindKeyboardCode = new BindKeyboard({ keyMode: "code" });
    const startMoving = jest.fn();
    const stopMoving = jest.fn();
    bindKeyboardCode.add("d", startMoving, true, "keydown");
    bindKeyboardCode.add("d", stopMoving, true, "keyup");

    dispatchEvent(
      new KeyboardEvent("keydown", { code: "KeyD", key: "d", repeat: false }),
    );
    expect(startMoving).toHaveBeenCalledTimes(1);

    // Release "d" while Shift is (for whatever reason) also currently held.
    dispatchEvent(
      new KeyboardEvent("keyup", {
        code: "KeyD",
        key: "d",
        shiftKey: true,
      }),
    );

    expect(stopMoving).toHaveBeenCalledTimes(1);

    bindKeyboardCode.stopListeners();
  });

  it('should resolve the "cmdOrCtrl" alias to ctrl on non-Mac and meta on Mac', () => {
    const { platform: originalPlatform } = navigator;

    try {
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        configurable: true,
      });
      expect(BindKeyboard.keyParser("cmdOrCtrl+a")).toBe("ctrl + a");
      expect(BindKeyboard.keyParser("cmdOrCtrl")).toBe("ctrl");

      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        configurable: true,
      });
      expect(BindKeyboard.keyParser("cmdOrCtrl+a")).toBe("meta + a");
      expect(BindKeyboard.keyParser("cmdOrCtrl")).toBe("meta");
      expect(BindKeyboard.keyParser("cmdOrCtrl+shift+z")).toBe(
        "shift + meta + z",
      );
    } finally {
      Object.defineProperty(navigator, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    }
  });

  it('should trigger a "cmdOrCtrl" binding on a real Cmd keydown when running on Mac', () => {
    const { platform: originalPlatform } = navigator;

    try {
      Object.defineProperty(navigator, "platform", {
        value: "MacIntel",
        configurable: true,
      });

      const callback = jest.fn();
      bindKeyboard.add("cmdOrCtrl+a", callback);

      dispatchEvent(new KeyboardEvent("keypress", { key: "a", metaKey: true }));

      expect(callback).toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    }
  });

  it("should not let AltGr's Ctrl+Alt artifact fire a ctrl+alt binding, but a real one still does", () => {
    // On Windows/Chrome, pressing AltGr (present on most non-US keyboards,
    // used to type e.g. @ or µ) reports ctrlKey AND altKey both true at
    // once — a well-documented OS-level artifact, not the user actually
    // holding Ctrl (mousetrap#271 "AltGr = Ctrl+Alt on Windows"; tinykeys'
    // suite has a dedicated "does not fire regular bindings when AltGraph
    // is active" case). Without getModifierState("AltGraph") support, any
    // "ctrl+alt+…" binding would fire on every AltGr press on those
    // layouts. happy-dom's KeyboardEvent doesn't honor the standard
    // `modifierAltGraph` init field, so getModifierState is monkey-patched
    // directly here to simulate what a real browser reports.
    const bindKeyboardCode = new BindKeyboard({ keyMode: "code" });
    const callback = jest.fn();
    bindKeyboardCode.add("ctrl+alt+m", callback, true, "keydown");

    const altGrEvent = new KeyboardEvent("keydown", {
      key: "µ",
      code: "KeyM",
      ctrlKey: true,
      altKey: true,
    });
    Object.defineProperty(altGrEvent, "getModifierState", {
      value: (modifier: string) => modifier === "AltGraph",
    });
    dispatchEvent(altGrEvent);
    expect(callback).not.toHaveBeenCalled();

    // A genuine Ctrl+Alt+M (AltGraph not reported) still fires normally.
    const realEvent = new KeyboardEvent("keydown", {
      key: "m",
      code: "KeyM",
      ctrlKey: true,
      altKey: true,
    });
    Object.defineProperty(realEvent, "getModifierState", {
      value: () => false,
    });
    dispatchEvent(realEvent);
    expect(callback).toHaveBeenCalledTimes(1);

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

  it("should ignore a keydown that's part of an active IME composition, but not the ordinary press right after it ends", () => {
    // Confirming an IME candidate (typing Japanese/Chinese/Korean, etc.)
    // commonly sends Enter — a key that carries no meaning of its own
    // during composition. isComposing is true for exactly those events and
    // false again the moment composition genuinely ends. Regression test
    // for a real gap found via tinykeys' own dedicated test for this.
    const bk = new BindKeyboard();
    const callback = jest.fn();
    bk.add("enter", callback, true, "keydown");

    const composing = new KeyboardEvent("keydown", { key: "Enter" });
    Object.defineProperty(composing, "isComposing", { value: true });
    dispatchEvent(composing);
    expect(callback).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(callback).toHaveBeenCalledTimes(1);

    bk.destroy();
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

  it("should not intercept keys while an input is focused by default (checkInputElements defaults to true)", () => {
    const guarded = new BindKeyboard();
    const callback = jest.fn();
    guarded.add("ctrl+a", callback);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(callback).not.toHaveBeenCalled();

    input.remove();
    guarded.destroy();
  });

  it("should not intercept keys while an input inside an open shadow root is focused", () => {
    // document.activeElement stops at a shadow root's host element — it
    // never reports the actual focused descendant inside an open shadow
    // root on its own. Regression test for a real gap found by reading
    // mousetrap's own test suite ("z key does not fire when inside an
    // input element in an open shadow dom"), confirmed to exist here too
    // before isInputOrTextArea started walking .shadowRoot.activeElement.
    const guarded = new BindKeyboard();
    const callback = jest.fn();
    guarded.add("ctrl+a", callback);

    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const input = document.createElement("input");
    shadow.appendChild(input);
    input.focus();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(callback).not.toHaveBeenCalled();

    host.remove();
    guarded.destroy();
  });

  it("should trigger bindings while an input is focused when checkInputElements is explicitly false", () => {
    const unguarded = new BindKeyboard({ checkInputElements: false });
    const callback = jest.fn();
    unguarded.add("ctrl+a", callback);

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(callback).toHaveBeenCalled();

    input.remove();
    unguarded.destroy();
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

  it("should not trigger a scoped binding while its scope is inactive, and should once enabled", () => {
    const scoped = new BindKeyboard();
    const callback = jest.fn();
    scoped.add("ctrl+k", callback, true, "keypress", { scope: "modal" });

    dispatchEvent(new KeyboardEvent("keypress", { key: "k", ctrlKey: true }));
    expect(callback).not.toHaveBeenCalled();

    scoped.enableScope("modal");
    dispatchEvent(new KeyboardEvent("keypress", { key: "k", ctrlKey: true }));
    expect(callback).toHaveBeenCalledTimes(1);

    scoped.disableScope("modal");
    dispatchEvent(new KeyboardEvent("keypress", { key: "k", ctrlKey: true }));
    expect(callback).toHaveBeenCalledTimes(1);

    scoped.destroy();
  });

  it("should prefer a scoped binding over an unscoped one for the same combination while that scope is active", () => {
    const scoped = new BindKeyboard();
    const globalCallback = jest.fn();
    const modalCallback = jest.fn();
    scoped.add("escape", globalCallback, true, "keydown");
    scoped.add("escape", modalCallback, true, "keydown", { scope: "modal" });

    dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(globalCallback).toHaveBeenCalledTimes(1);
    expect(modalCallback).not.toHaveBeenCalled();

    scoped.enableScope("modal");
    dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(globalCallback).toHaveBeenCalledTimes(1);
    expect(modalCallback).toHaveBeenCalledTimes(1);

    scoped.disableScope("modal");
    dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(globalCallback).toHaveBeenCalledTimes(2);
    expect(modalCallback).toHaveBeenCalledTimes(1);

    scoped.destroy();
  });

  it("should replace the whole active-scope set via setActiveScopes, and expose it via getActiveScopes", () => {
    const scoped = new BindKeyboard();
    scoped.enableScope(["a", "b"]);
    expect(scoped.getActiveScopes().sort()).toEqual(["a", "b"]);

    scoped.setActiveScopes(["c"]);
    expect(scoped.getActiveScopes()).toEqual(["c"]);

    scoped.destroy();
  });

  it("should look up and remove a specific scope's binding via getKeybind/remove without touching the unscoped one", () => {
    const scoped = new BindKeyboard();
    scoped.add("ctrl+k", jest.fn(), true, "keypress");
    scoped.add("ctrl+k", jest.fn(), true, "keypress", { scope: "modal" });

    expect(scoped.getKeybind("ctrl+k")).toBeDefined();
    expect(scoped.getKeybind("ctrl+k", "keypress", "modal")).toBeDefined();
    expect(
      scoped.getKeybind("ctrl+k", "keypress", "other-scope"),
    ).not.toBeDefined();

    expect(scoped.remove("ctrl+k", "keypress", "modal")).toBe(true);
    expect(scoped.getKeybind("ctrl+k", "keypress", "modal")).not.toBeDefined();
    expect(scoped.getKeybind("ctrl+k")).toBeDefined();

    scoped.destroy();
  });

  it("should not conflict across different scopes with override: false, but should within the same scope", () => {
    const scoped = new BindKeyboard();
    scoped.add("ctrl+k", jest.fn(), true, "keypress", { scope: "a" });

    expect(() =>
      scoped.add("ctrl+k", jest.fn(), true, "keypress", {
        scope: "b",
        override: false,
      }),
    ).not.toThrow();

    expect(() =>
      scoped.add("ctrl+k", jest.fn(), true, "keypress", {
        scope: "a",
        override: false,
      }),
    ).toThrow(KeybindError);

    scoped.destroy();
  });

  it("should include scoped bindings in getAllBindings()", () => {
    const scoped = new BindKeyboard();
    scoped.add("ctrl+k", jest.fn(), true, "keypress");
    scoped.add("ctrl+k", jest.fn(), true, "keypress", { scope: "modal" });

    const scopes = scoped.getAllBindings().map((entry) => entry.scope);
    expect(scopes).toHaveLength(2);
    expect(scopes).toContain("modal");
    expect(scopes).toContain(undefined);

    scoped.destroy();
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

  it("should log every observed key event when debug is 2", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally silences console.log noise for this test.
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const debugKeyboard = new BindKeyboard({ debug: 2 });

    dispatchEvent(new KeyboardEvent("keypress", { key: "z" }));
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    debugKeyboard.destroy();
  });

  it("should log only matched bindings when debug is 1", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally silences console.log noise for this test.
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const debugKeyboard = new BindKeyboard({ debug: 1 });
    debugKeyboard.add("ctrl+a", jest.fn());

    dispatchEvent(new KeyboardEvent("keypress", { key: "z" }));
    expect(logSpy).not.toHaveBeenCalled();

    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    debugKeyboard.destroy();
  });

  it("should warn (under debug) when registering a commonly-reserved browser shortcut, and stay silent otherwise", () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function -- intentionally silences console.warn noise for this test.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const debugKeyboard = new BindKeyboard({ debug: 1, autostart: false });

    debugKeyboard.add("ctrl+p", jest.fn());
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Print"));

    warnSpy.mockClear();
    bindKeyboard.add("ctrl+p", jest.fn());
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("should throw KeybindError when no key or modifier is provided", () => {
    expect(() => BindKeyboard.getKeyCombination({})).toThrow(KeybindError);
  });

  it("should expose keyParser and getKeyCombination as static methods", () => {
    expect(BindKeyboard.keyParser("ctrl+a")).toBe("ctrl + a");
    expect(BindKeyboard.getKeyCombination({ key: "a", ctrlKey: true })).toBe(
      "ctrl + a",
    );
  });

  it("should return the configured target from .getTarget()", () => {
    const target = document.createElement("div");
    const targeted = new BindKeyboard({ target });

    expect(targeted.getTarget()).toBe(target);

    targeted.destroy();
  });

  it("should still work via the deprecated startListners/stopListners aliases", () => {
    const callback = jest.fn();
    const aliased = new BindKeyboard({ autostart: false });
    aliased.add("ctrl+a", callback);

    aliased.startListners();
    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(callback).toHaveBeenCalled();

    aliased.stopListners();
    callback.mockClear();
    dispatchEvent(new KeyboardEvent("keypress", { key: "a", ctrlKey: true }));
    expect(callback).not.toHaveBeenCalled();
  });
});

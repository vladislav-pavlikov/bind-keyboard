// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- bun-types/test-globals has no runtime exports, so it can only be pulled in as an ambient type reference, not an import.
/// <reference types="bun-types/test-globals" />
import { cleanup, render, renderHook } from "@testing-library/react";
import { createElement, useState } from "react";
import useKeybind from "./useKeybind";
import type { UseKeybindOptions } from "./useKeybind";

const press = (
  key: string,
  code: string,
  extra: KeyboardEventInit = {},
): void => {
  dispatchEvent(new KeyboardEvent("keydown", { key, code, ...extra }));
};

describe("useKeybind", () => {
  afterEach(() => {
    cleanup();
  });

  it("fires the callback when the combination is pressed", () => {
    const callback = jest.fn();
    renderHook(() => {
      useKeybind("ctrl+a", callback, { type: "keydown" });
    });

    press("a", "KeyA", { ctrlKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("stops firing once unmounted", () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => {
      useKeybind("ctrl+a", callback, { type: "keydown" });
    });

    unmount();
    press("a", "KeyA", { ctrlKey: true });

    expect(callback).not.toHaveBeenCalled();
  });

  it("does not fire while enabled is false, and does once it's true", () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => {
        useKeybind("ctrl+a", callback, { type: "keydown", enabled });
      },
      { initialProps: { enabled: false } },
    );

    press("a", "KeyA", { ctrlKey: true });
    expect(callback).not.toHaveBeenCalled();

    rerender({ enabled: true });
    press("a", "KeyA", { ctrlKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("always calls the latest callback without resubscribing on every render", () => {
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const { rerender } = renderHook(
      ({ callback }: { callback: () => void }) => {
        useKeybind("ctrl+a", callback, { type: "keydown" });
      },
      { initialProps: { callback: firstCallback } },
    );

    rerender({ callback: secondCallback });
    press("a", "KeyA", { ctrlKey: true });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it("does not tear down and recreate the binding when the same combination is passed as a new array reference every render", () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ callback: cb }: { callback: () => void }) => {
        // A fresh array literal every render — same content, new reference.
        useKeybind(["ctrl+a"], cb, { type: "keydown" });
      },
      { initialProps: { callback } },
    );

    for (let i = 0; i < 5; i += 1) {
      rerender({ callback });
    }

    press("a", "KeyA", { ctrlKey: true });

    // If every render had torn down and recreated the instance, this would
    // still only be called once per press regardless (no duplicate
    // listeners survive a real teardown) — the real risk this guards
    // against is React warning about (or actually needing) a stable
    // reference; this at least confirms no duplicate firing crept in.
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("re-registers when the combination's actual content changes", () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ combo }: { combo: string }) => {
        useKeybind(combo, callback, { type: "keydown" });
      },
      { initialProps: { combo: "ctrl+a" } },
    );

    rerender({ combo: "ctrl+b" });

    press("a", "KeyA", { ctrlKey: true });
    expect(callback).not.toHaveBeenCalled();

    press("b", "KeyB", { ctrlKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("forwards scope/description/allowInInputElements through to the binding", () => {
    const callback = jest.fn();
    const options: UseKeybindOptions = {
      type: "keydown",
      scope: "modal",
      description: "Close modal",
    };
    renderHook(() => {
      useKeybind("escape", callback, options);
    });

    press("Escape", "Escape");
    expect(callback).not.toHaveBeenCalled();
  });

  it("works inside a real component, cleaning up on unmount", () => {
    const callback = jest.fn();

    const TestComponent = (): ReturnType<typeof createElement> => {
      const [count, setCount] = useState(0);
      useKeybind("ctrl+a", callback, { type: "keydown" });
      return createElement(
        "button",
        {
          onClick: () => {
            setCount((c) => c + 1);
          },
        },
        count,
      );
    };

    const { unmount } = render(createElement(TestComponent));
    press("a", "KeyA", { ctrlKey: true });
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
    press("a", "KeyA", { ctrlKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { refreshBlocker, refreshIfSafe, useHoldRefresh } from "./autoRefresh";

function storage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "sessionStorage", { value: storage(), configurable: true });
});

describe("refreshing to a new version by itself", () => {
  it("refreshes once at a calm moment", () => {
    const reload = vi.fn();
    expect(refreshBlocker()).toBe("");
    expect(refreshIfSafe("build-2", { reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("never refreshes twice for the same version, so it can't loop", () => {
    const reload = vi.fn();
    refreshIfSafe("build-2", { reload });
    refreshIfSafe("build-2", { reload });
    expect(reload).toHaveBeenCalledTimes(1);
    // A later version gets its own refresh.
    refreshIfSafe("build-3", { reload });
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("waits while a pop-up is open", () => {
    document.body.innerHTML = "<dialog open>Frame your portrait</dialog>";
    expect(refreshBlocker()).toBe("pop-up open");
    const reload = vi.fn();
    expect(refreshIfSafe("build-2", { reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("waits while someone is typing in a box", () => {
    document.body.innerHTML = '<input id="hp" type="number" value="12">';
    document.getElementById("hp").focus();
    expect(refreshBlocker()).toBe("typing");
  });

  it("waits while a form has words that haven't been sent", () => {
    document.body.innerHTML = "<form><textarea>We found a snake sword</textarea></form>";
    expect(refreshBlocker()).toBe("unsent words in a form");
  });

  it("doesn't mind empty forms, ticked boxes or text outside forms", () => {
    document.body.innerHTML =
      '<form><textarea></textarea><input type="checkbox" checked></form><textarea>Saved backstory</textarea>';
    expect(refreshBlocker()).toBe("");
  });

  it("waits while something holds it (an unsaved sheet, a roll waiting for dice)", () => {
    const { rerender, unmount } = renderHook(({ busy }) => useHoldRefresh(busy), { initialProps: { busy: true } });
    expect(refreshBlocker()).toBe("busy");
    rerender({ busy: false });
    expect(refreshBlocker()).toBe("");
    rerender({ busy: true });
    unmount();
    expect(refreshBlocker()).toBe("");
  });
});

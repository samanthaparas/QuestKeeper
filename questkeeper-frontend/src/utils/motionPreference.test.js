import { describe, it, expect, beforeEach, vi } from "vitest";
import { installFakeStorage } from "../test/fakeStorage";
import {
  applyMotionPreference,
  getMotionPreference,
  setMotionPreference,
  shouldReduceMotion,
} from "./motionPreference";

describe("Reduce Motion setting", () => {
  beforeEach(() => {
    installFakeStorage();
    delete document.documentElement.dataset.motion;
  });

  it("follows the device until the player turns it on", () => {
    expect(getMotionPreference()).toBe("device");
    expect(shouldReduceMotion()).toBe(false);

    setMotionPreference("reduce");
    expect(getMotionPreference()).toBe("reduce");
    expect(document.documentElement.dataset.motion).toBe("reduce");
    expect(shouldReduceMotion()).toBe(true);

    setMotionPreference("device");
    expect(window.localStorage.getItem("qk-motion")).toBeNull();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("puts a saved choice back when the app starts", () => {
    window.localStorage.setItem("qk-motion", "reduce");
    applyMotionPreference();
    expect(document.documentElement.dataset.motion).toBe("reduce");
  });

  it("still respects the device's own Reduce Motion", () => {
    vi.stubGlobal("matchMedia", (query) => ({ matches: query.includes("reduce") }));
    expect(shouldReduceMotion()).toBe(true);
    vi.unstubAllGlobals();
  });

  it("ignores a stored value it doesn't know", () => {
    window.localStorage.setItem("qk-motion", "sparkles");
    expect(getMotionPreference()).toBe("device");
  });
});

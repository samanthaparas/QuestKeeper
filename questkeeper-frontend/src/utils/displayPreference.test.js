import { describe, it, expect, beforeEach } from "vitest";
import { applyDisplayPreferences, getHighContrast, getTextSize, setHighContrast, setTextSize } from "./displayPreference";
import { installFakeStorage } from "../test/fakeStorage";

describe("text size and contrast", () => {
  beforeEach(() => {
    installFakeStorage();
    applyDisplayPreferences("normal", false);
  });

  it("starts at normal size and normal contrast", () => {
    expect(getTextSize()).toBe("normal");
    expect(getHighContrast()).toBe(false);
    expect(document.documentElement.dataset.textSize).toBeUndefined();
  });

  it("saves the choices on this device and puts them on the page", () => {
    setTextSize("larger");
    setHighContrast(true);
    expect(getTextSize()).toBe("larger");
    expect(document.documentElement.dataset.textSize).toBe("larger");
    expect(document.documentElement.dataset.contrast).toBe("high");

    setTextSize("normal");
    setHighContrast(false);
    expect(window.localStorage.getItem("qk-text-size")).toBeNull();
    expect(document.documentElement.dataset.textSize).toBeUndefined();
    expect(document.documentElement.dataset.contrast).toBeUndefined();
  });

  it("ignores a saved value it doesn't know", () => {
    window.localStorage.setItem("qk-text-size", "gigantic");
    expect(getTextSize()).toBe("normal");
  });
});

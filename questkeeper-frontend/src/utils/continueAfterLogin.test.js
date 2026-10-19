import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  clearDestination,
  describeDestination,
  isSafeDestination,
  readDestination,
  rememberDestination,
  safeDestination,
} from "./continueAfterLogin";
import { installFakeStorage } from "../test/fakeStorage";

describe("continue after login", () => {
  beforeEach(() => installFakeStorage());

  it("only ever points at QuestKeeper's own pages", () => {
    expect(isSafeDestination("/characters/new")).toBe(true);
    expect(isSafeDestination("/games?code=ABC")).toBe(true);
    for (const bad of ["//evil.example", "https://evil.example", "javascript:alert(1)", "/login", null, 42]) {
      expect(isSafeDestination(bad)).toBe(false);
    }
    rememberDestination({ from: "//evil.example" });
    expect(readDestination()).toBeNull();
  });

  it("refuses look-alikes that some browsers treat as another site", () => {
    for (const bad of ["/\\evil.example", "/\tevil", " /games", "/games\n", "/x\u0000", "/login?next=/x", "/" + "a".repeat(600)]) {
      expect(isSafeDestination(bad)).toBe(false);
    }
    // A page that merely starts with the letters "login" is still fine.
    expect(isSafeDestination("/loginhelp")).toBe(true);
    expect(safeDestination({ from: "/\\evil.example" })).toBeNull();
  });

  it("removes a hand-edited, broken or external note instead of following it", () => {
    for (const raw of ["{not json", JSON.stringify({ from: "https://evil.example", savedAt: Date.now() }), JSON.stringify({ from: "/games" })]) {
      window.localStorage.setItem("qk-continue-after-login", raw);
      expect(readDestination()).toBeNull();
      expect(window.localStorage.getItem("qk-continue-after-login")).toBeNull();
    }
  });

  it("keeps only plain values (a build id, an invite code) from what the page carried", () => {
    rememberDestination({
      from: "/games",
      fromState: { code: "ABC123", nested: { a: 1 }, fn: "x".repeat(300), ok: true },
    });
    expect(readDestination()).toEqual({ from: "/games", fromState: { code: "ABC123", ok: true } });
    expect(safeDestination({ from: "/games", fromState: ["a"] })).toEqual({ from: "/games", fromState: null });
  });

  it("remembers the destination and what it carried, until cleared", () => {
    rememberDestination({ from: "/characters/new", fromState: { quizBuild: "iron-guardian" } });
    expect(readDestination()).toEqual({ from: "/characters/new", fromState: { quizBuild: "iron-guardian" } });
    clearDestination();
    expect(readDestination()).toBeNull();
  });

  it("forgets after a day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T08:00:00Z"));
    rememberDestination({ from: "/characters" });
    vi.setSystemTime(new Date("2026-10-20T09:00:00Z"));
    expect(readDestination()).toBeNull();
    // And the old note is gone, not just ignored.
    expect(window.localStorage.getItem("qk-continue-after-login")).toBeNull();
    vi.useRealTimers();
  });

  it("describes only what really happens next", () => {
    expect(describeDestination({ from: "/characters/new", fromState: { quizBuild: "iron-guardian" } }).title).toBe(
      "Save your Iron Guardian",
    );
    expect(describeDestination({ from: "/games?code=X" }).action).toBe("Continue to your table");
    expect(describeDestination({ from: "/dm" }).action).toBe("Continue to your table");
    expect(describeDestination(null)).toBeNull();
  });
});

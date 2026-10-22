import { describe, it, expect, beforeEach } from "vitest";
import { clearAllSheetCaches, clearSheetCache, readSheetCache, writeSheetCache } from "./sheetCache";
import { installFakeStorage } from "../test/fakeStorage";

describe("sheetCache", () => {
  beforeEach(() => installFakeStorage());

  it("keeps a copy of a sheet, with whether the server has it", () => {
    expect(readSheetCache("a")).toBeNull();
    writeSheetCache("a", { sheet: { name: "Pippa" }, synced: false, baseUpdatedAt: "2026-10-20T00:00:00Z" });
    expect(readSheetCache("a")).toMatchObject({ sheet: { name: "Pippa" }, synced: false, baseUpdatedAt: "2026-10-20T00:00:00Z" });

    writeSheetCache("a", { sheet: { name: "Pippa" }, synced: true });
    expect(readSheetCache("a").synced).toBe(true);
  });

  it("keeps only the most recently used few, so storage never fills up", () => {
    for (let n = 0; n < 15; n += 1) writeSheetCache(`c${n}`, { sheet: { n }, synced: true });
    expect(readSheetCache("c0")).toBeNull();
    expect(readSheetCache("c2")).toBeNull();
    expect(readSheetCache("c3")).not.toBeNull();
    expect(readSheetCache("c14")).not.toBeNull();
  });

  it("clears one copy, or all of them (on sign-out)", () => {
    writeSheetCache("a", { sheet: { n: 1 }, synced: true });
    writeSheetCache("b", { sheet: { n: 2 }, synced: true });
    clearSheetCache("a");
    expect(readSheetCache("a")).toBeNull();
    expect(readSheetCache("b")).not.toBeNull();

    clearAllSheetCaches();
    expect(readSheetCache("b")).toBeNull();
  });

  it("copes with blocked or damaged storage", () => {
    window.localStorage.setItem("qk-sheet-bad", "{not json");
    expect(readSheetCache("bad")).toBeNull();

    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("full");
    };
    expect(writeSheetCache("x", { sheet: {}, synced: false })).toBe(false);
    window.localStorage.setItem = original;
  });
});

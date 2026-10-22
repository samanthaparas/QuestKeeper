import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadSheet } from "./loadSheet";
import { readSheetCache, writeSheetCache } from "./sheetCache";
import { installFakeStorage } from "../test/fakeStorage";

vi.mock("./supabaseClient", () => ({ supabase: {} }));

const server = { id: "c1", name: "Pippa", hp: 11, updatedAt: "2026-10-21T20:00:00Z" };

describe("loadSheet", () => {
  beforeEach(() => installFakeStorage());

  it("opens the server's sheet and keeps a fresh copy", async () => {
    const result = await loadSheet("c1", async () => server);
    expect(result).toEqual({ sheet: server, source: "server" });
    expect(readSheetCache("c1")).toMatchObject({ sheet: server, synced: true, baseUpdatedAt: server.updatedAt });
  });

  it("says when the character isn't there", async () => {
    expect(await loadSheet("c1", async () => null)).toEqual({ sheet: null, source: "server" });
  });

  it("opens the copy on this device when the server can't be reached", async () => {
    writeSheetCache("c1", { sheet: { ...server, hp: 9 }, synced: true, baseUpdatedAt: server.updatedAt });
    const result = await loadSheet("c1", async () => {
      throw new Error("Failed to fetch");
    });
    expect(result).toMatchObject({ source: "offline", unsynced: false, sheet: { hp: 9 } });
  });

  it("opens an offline copy with changes that hadn't saved, and says so", async () => {
    writeSheetCache("c1", { sheet: { ...server, hp: 4 }, synced: false, baseUpdatedAt: server.updatedAt });
    const result = await loadSheet("c1", async () => {
      throw new Error("offline");
    });
    expect(result).toMatchObject({ source: "offline", unsynced: true, sheet: { hp: 4 } });
  });

  it("throws when the server can't be reached and there is no copy", async () => {
    await expect(
      loadSheet("c1", async () => {
        throw new Error("offline");
      }),
    ).rejects.toThrow("offline");
  });

  it("brings back changes that never saved, when the sheet hasn't changed elsewhere", async () => {
    writeSheetCache("c1", { sheet: { ...server, hp: 3 }, synced: false, baseUpdatedAt: server.updatedAt });
    const result = await loadSheet("c1", async () => server);
    expect(result).toMatchObject({ source: "recovered", unsynced: true, sheet: { hp: 3, updatedAt: server.updatedAt } });
  });

  it("asks which to keep when the sheet changed elsewhere while edits were waiting", async () => {
    writeSheetCache("c1", { sheet: { ...server, hp: 3 }, synced: false, baseUpdatedAt: "2026-10-20T00:00:00Z" });
    const result = await loadSheet("c1", async () => server);
    expect(result).toMatchObject({ source: "conflict", sheet: server, mine: { hp: 3 } });
    // Nothing is overwritten until the person chooses.
    expect(readSheetCache("c1").synced).toBe(false);
  });
});

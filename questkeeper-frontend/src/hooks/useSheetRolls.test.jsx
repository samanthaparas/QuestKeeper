import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSheetRolls } from "./useSheetRolls";
import { listCharacterTables, logRoll } from "../utils/tableStore";
import { installFakeStorage } from "../test/fakeStorage";

vi.mock("../utils/tableStore", () => ({
  listCharacterTables: vi.fn(),
  logRoll: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  installFakeStorage();
  vi.spyOn(Math, "random").mockReturnValue(0.5); // every d20 is an 11
  logRoll.mockResolvedValue();
});

afterEach(() => vi.restoreAllMocks());

describe("useSheetRolls", () => {
  it("shares rolls with the character's table", async () => {
    listCharacterTables.mockResolvedValue([{ id: "t1", name: "Friday Game" }]);
    const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
    await waitFor(() => expect(result.current.tableName).toBe("Friday Game"));

    act(() => result.current.roll("Stealth", 5));

    expect(logRoll).toHaveBeenCalledWith("t1", {
      who: "Billie",
      label: "Stealth",
      detail: "d20 11 + 5",
      total: 16,
    });
    await waitFor(() => expect(result.current.lastRoll.status).toBe("shared"));
  });

  it("keeps rolls private when sharing is off, and remembers that", async () => {
    listCharacterTables.mockResolvedValue([{ id: "t1", name: "Friday Game" }]);
    const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
    await waitFor(() => expect(result.current.tableName).toBe("Friday Game"));

    act(() => result.current.setShare(false));
    act(() => result.current.roll("Stealth", 5));

    expect(logRoll).not.toHaveBeenCalled();
    expect(result.current.lastRoll.status).toBe("private");
    expect(window.localStorage.getItem("qk-share-rolls-char-1")).toBe("off");
  });

  it("says when sharing fails, and still shows the roll", async () => {
    listCharacterTables.mockResolvedValue([{ id: "t1", name: "Friday Game" }]);
    logRoll.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
    await waitFor(() => expect(result.current.tableName).toBe("Friday Game"));

    act(() => result.current.roll("Stealth", 5));
    expect(result.current.lastRoll.total).toBe(16);
    await waitFor(() => expect(result.current.lastRoll.status).toBe("failed"));
  });

  it("rolls privately when the character isn't at a table", async () => {
    listCharacterTables.mockResolvedValue([]);
    const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
    await waitFor(() => expect(listCharacterTables).toHaveBeenCalled());

    act(() => result.current.rollDamage("Dagger damage", "1d4+2"));
    expect(result.current.lastRoll).toMatchObject({ kind: "damage", total: 5, status: "private" });
    expect(logRoll).not.toHaveBeenCalled();
  });
});

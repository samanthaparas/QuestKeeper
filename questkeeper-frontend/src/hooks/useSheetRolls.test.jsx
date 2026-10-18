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

  describe("real dice", () => {
    it("asks for the numbers instead of rolling, then adds the bonus", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      const onResult = vi.fn();

      act(() => result.current.setRealDice(true));
      act(() => {
        const returned = result.current.roll("Stealth", 5, { onResult });
        expect(returned).toBeNull();
      });
      expect(result.current.pending).toMatchObject({ type: "check", label: "Stealth", bonus: 5 });
      expect(result.current.lastRoll).toBeNull();

      let problem;
      act(() => {
        problem = result.current.submitRealDice("14");
      });

      expect(problem).toBeNull();
      expect(result.current.lastRoll).toMatchObject({ label: "Stealth", total: 19, detail: "d20 14 + 5" });
      expect(result.current.pending).toBeNull();
      expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ natural: 14, total: 19 }));
    });

    it("keeps waiting and explains when the number can't be on a d20", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.setRealDice(true));
      act(() => result.current.roll("Stealth", 5));

      let problem;
      act(() => {
        problem = result.current.submitRealDice("25");
      });

      expect(problem).toBe("A d20 only shows 1 to 20, not 25.");
      expect(result.current.pending).not.toBeNull();
    });

    it("takes both d20s with advantage", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.setRealDice(true));
      act(() => result.current.setMode("advantage"));
      act(() => result.current.roll("Stealth", 2));

      act(() => {
        result.current.submitRealDice("14, 7");
      });

      expect(result.current.lastRoll.natural).toBe(14);
      expect(result.current.mode).toBe("normal");
    });

    it("adds up damage dice typed by the player, and remembers the choice", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.setRealDice(true));
      act(() => result.current.rollDamage("Fireball", "10d6"));

      act(() => {
        result.current.submitRealDice("6, 2, 3, 6, 1, 1, 5, 4, 6, 2");
      });

      expect(result.current.lastRoll).toMatchObject({ label: "Fireball", total: 36 });
      expect(window.localStorage.getItem("qk-real-dice-char-1")).toBe("on");
    });

    it("still rolls damage the app can't read as dice", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.setRealDice(true));
      act(() => result.current.rollDamage("Odd", "special"));

      expect(result.current.pending).toBeNull();
    });
  });
});


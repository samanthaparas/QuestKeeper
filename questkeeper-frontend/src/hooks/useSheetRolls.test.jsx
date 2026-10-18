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

  describe("extra damage on a damage roll", () => {
    it("rolls the extra with the app and adds it to the damage shown", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.rollDamage("Longsword damage", "1d8+3")); // d8 -> 5, total 8

      let problem;
      act(() => {
        problem = result.current.addExtraDamage("2d8", "Smite"); // 2d8 -> 5 + 5
      });

      expect(problem).toBeNull();
      expect(result.current.lastRoll.total).toBe(18);
      expect(result.current.lastRoll.detail).toContain("| Smite 2d8 [5, 5] = 10");
    });

    it("asks for the extra's dice with real dice, then adds them", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.setRealDice(true));
      act(() => result.current.rollDamage("Longsword damage", "2d8+3"));
      act(() => {
        result.current.submitRealDice("5, 3");
      });
      expect(result.current.lastRoll.total).toBe(11);

      act(() => {
        result.current.addExtraDamage("2d8", "Smite");
      });
      expect(result.current.pending).toMatchObject({ type: "extra", label: "Smite" });

      let problem;
      act(() => {
        problem = result.current.submitRealDice("6, 2");
      });

      expect(problem).toBeNull();
      expect(result.current.lastRoll.total).toBe(19);
      expect(result.current.lastRoll.detail).toContain("| Smite 2d8 [6, 2] = 8");
      expect(result.current.pending).toBeNull();
    });

    it("takes the extra's real dice in the same step when the numbers come with it", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.setRealDice(true));
      act(() => result.current.rollDamage("Longsword damage", "2d8+10"));
      act(() => {
        result.current.submitRealDice("8, 8");
      });

      let problem;
      act(() => {
        problem = result.current.addExtraDamage("2d8", "Smite", "6, 2");
      });

      expect(problem).toBeNull();
      expect(result.current.pending).toBeNull();
      expect(result.current.lastRoll.total).toBe(34);
      expect(result.current.lastRoll.extras).toEqual([{ label: "Smite", total: 8 }]);
    });

    it("explains real dice numbers that don't fit the extra", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.setRealDice(true));
      act(() => result.current.rollDamage("Longsword damage", "2d8+10"));
      act(() => {
        result.current.submitRealDice("8, 8");
      });

      let problem;
      act(() => {
        problem = result.current.addExtraDamage("2d8", "Smite", "6");
      });

      expect(problem).toMatch(/need 2 numbers|needs 2 numbers/);
      expect(result.current.lastRoll.total).toBe(26);
    });

    it("doubles the extra's dice after a critical hit", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => result.current.rollDamage("Longsword damage", "1d8+3", { crit: true })); // 5 x2 + 3 = 13
      act(() => {
        result.current.addExtraDamage("2d8", "Smite"); // (5 + 5) x2 = 20
      });
      expect(result.current.lastRoll.total).toBe(33);
    });

    it("explains when there's no damage roll to add to, or the extra can't be read", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      expect(result.current.addExtraDamage("2d8", "Smite")).toMatch(/Roll damage first/);

      act(() => result.current.rollDamage("Longsword damage", "1d8+3"));
      expect(result.current.addExtraDamage("smite", "")).toMatch(/like 2d8/);
    });

    it("shares the extra with the table as its own line", async () => {
      listCharacterTables.mockResolvedValue([{ id: "t1", name: "Friday Game" }]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      await waitFor(() => expect(result.current.tableName).toBe("Friday Game"));
      act(() => result.current.rollDamage("Longsword damage", "1d8+3"));

      act(() => {
        result.current.addExtraDamage("2d8", "Smite");
      });

      expect(logRoll).toHaveBeenLastCalledWith("t1", {
        who: "Billie",
        label: "Smite (extra damage)",
        detail: "2d8 [5, 5]",
        total: 10,
      });
    });
  });

  describe("roll history", () => {
    it("remembers each roll, newest first, with the extra damage added to its entry", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));

      act(() => result.current.roll("Stealth", 5)); // d20 11 + 5 = 16
      act(() => result.current.rollDamage("Longsword damage", "1d8+3")); // 5 + 3 = 8
      act(() => {
        result.current.addExtraDamage("2d8", "Smite"); // +10
      });

      expect(result.current.history.map((entry) => entry.label)).toEqual(["Longsword damage", "Stealth"]);
      expect(result.current.history[0]).toMatchObject({
        total: 18,
        extras: [{ label: "Smite", total: 10 }],
      });
      expect(result.current.history[1]).toMatchObject({ total: 16, kind: "check" });
    });

    it("keeps the history on this device, per character", () => {
      listCharacterTables.mockResolvedValue([]);
      const first = renderHook(() => useSheetRolls("char-1", "Billie"));
      act(() => first.result.current.roll("Stealth", 5));
      first.unmount();

      const again = renderHook(() => useSheetRolls("char-1", "Billie"));
      expect(again.result.current.history).toHaveLength(1);
      expect(again.result.current.history[0].label).toBe("Stealth");

      const other = renderHook(() => useSheetRolls("char-2", "Thorn"));
      expect(other.result.current.history).toEqual([]);
    });

    it("keeps only the last 100 and can be cleared", () => {
      listCharacterTables.mockResolvedValue([]);
      const { result } = renderHook(() => useSheetRolls("char-1", "Billie"));
      for (let i = 0; i < 105; i += 1) act(() => result.current.roll(`Roll ${i}`, 0));

      expect(result.current.history).toHaveLength(100);
      expect(result.current.history[0].label).toBe("Roll 104");

      act(() => result.current.clearHistory());
      expect(result.current.history).toEqual([]);
    });
  });
});


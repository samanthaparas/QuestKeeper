import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTableTurn } from "./useTableTurn";
import { getActiveCombatForCharacter } from "../utils/tableStore";

vi.mock("../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../context/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("../utils/tableStore", () => ({
  getActiveCombatForCharacter: vi.fn(),
  subscribeToTable: vi.fn(() => () => {}),
}));

// Newer Node versions ship their own incomplete localStorage that can shadow the
// test environment's, so this test brings a tiny in-memory one. That keeps it
// passing on any Node version (CI runs a newer Node than a laptop might).
function installFakeStorage() {
  const data = new Map();
  const fake = {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => data.clear(),
  };

  vi.stubGlobal("localStorage", fake);
  try {
    Object.defineProperty(window, "localStorage", { value: fake, configurable: true });
  } catch {
    // The stubbed global above is enough where window is the global object.
  }
}

function combatFor(tableId, tableName) {
  return {
    table: { id: tableId, name: tableName, round: 1, current_combatant_id: null },
    combatants: [],
    events: [],
    damageRequests: [],
    activeTables: [
      { id: "t-new", name: "Final Fight Practice" },
      { id: "t-old", name: "Sam's Silly Garden Chase" },
    ],
  };
}

describe("useTableTurn", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    installFakeStorage();
    getActiveCombatForCharacter.mockImplementation(async (characterId, userId, preferred) =>
      preferred === "t-old" ? combatFor("t-old", "Sam's Silly Garden Chase") : combatFor("t-new", "Final Fight Practice"),
    );
  });

  it("reports the table name and every table in combat", async () => {
    const { result } = renderHook(() => useTableTurn("char-1"));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.tableName).toBe("Final Fight Practice");
    expect(result.current.activeTables).toHaveLength(2);
  });

  it("switches to another table and remembers the choice", async () => {
    const { result } = renderHook(() => useTableTurn("char-1"));
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => result.current.switchTable("t-old"));

    await waitFor(() => expect(result.current.tableName).toBe("Sam's Silly Garden Chase"));
    expect(getActiveCombatForCharacter).toHaveBeenLastCalledWith("char-1", "u1", "t-old");
    expect(window.localStorage.getItem("qk-active-table-char-1")).toBe("t-old");
  });

  it("starts on the remembered table next time", async () => {
    window.localStorage.setItem("qk-active-table-char-1", "t-old");
    const { result } = renderHook(() => useTableTurn("char-1"));

    await waitFor(() => expect(result.current?.tableName).toBe("Sam's Silly Garden Chase"));
  });

  it("keeps each character's choice separate", async () => {
    window.localStorage.setItem("qk-active-table-char-1", "t-old");
    const { result } = renderHook(() => useTableTurn("char-2"));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.tableName).toBe("Final Fight Practice");
  });
});

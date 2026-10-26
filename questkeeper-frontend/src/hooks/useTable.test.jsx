import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTable } from "./useTable";
import { getTable } from "../utils/tableStore";

vi.mock("../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../context/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("../utils/tableStore", () => ({
  getTable: vi.fn(),
  listMembers: vi.fn(),
  listCombatants: vi.fn(),
  listEnemyHp: vi.fn(),
  listEvents: vi.fn(),
  subscribeToTable: vi.fn(() => () => {}),
}));

describe("useTable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps a failed request (an error) apart from a table that isn't there (no error), even on a retry", async () => {
    getTable.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useTable("t1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.table).toBeNull();
    expect(result.current.error).toBe("Failed to fetch");

    // The retry finds nothing: now it's "not found", not the old failure.
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.table).toBeNull();
    expect(result.current.error).toBe("");
  });
});

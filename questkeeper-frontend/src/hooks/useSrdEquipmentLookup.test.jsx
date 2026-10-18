import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSrdEquipmentLookup } from "./useSrdEquipmentLookup";
import { getEquipment, getMagicItems } from "../utils/api";

vi.mock("../utils/api", () => ({
  getEquipment: vi.fn(),
  getEquipmentDetails: vi.fn(),
  getMagicItems: vi.fn(),
  getMagicItemDetails: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("useSrdEquipmentLookup", () => {
  it("finds items by name once the lists load", async () => {
    getEquipment.mockResolvedValue([{ index: "explorers-pack", name: "Explorer's Pack" }]);
    getMagicItems.mockResolvedValue([]);
    const { result } = renderHook(() => useSrdEquipmentLookup());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.findMatches("Explorer's Pack")).toHaveLength(2);
  });

  it("says it failed when none of the lists load, and can try again", async () => {
    getEquipment.mockRejectedValue(new Error("offline"));
    getMagicItems.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSrdEquipmentLookup());

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.findMatches("Explorer's Pack")).toEqual([]);

    getEquipment.mockResolvedValue([{ index: "explorers-pack", name: "Explorer's Pack" }]);
    getMagicItems.mockResolvedValue([]);
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.findMatches("Explorer's Pack").length).toBeGreaterThan(0);
  });

  it("is ready if at least one list loads", async () => {
    getEquipment.mockResolvedValue([{ index: "dagger", name: "Dagger" }]);
    getMagicItems.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useSrdEquipmentLookup());

    await waitFor(() => expect(result.current.status).toBe("ready"));
  });
});

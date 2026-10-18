import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSrdEquipmentLookup, RETRY_DELAYS } from "./useSrdEquipmentLookup";
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

  it("keeps trying quietly while the server wakes up, and never says failed if it comes back", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getEquipment.mockRejectedValue(new Error("waking up"));
    getMagicItems.mockRejectedValue(new Error("waking up"));
    const { result } = renderHook(() => useSrdEquipmentLookup());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS[0] + 50);
    });
    // Still just looking, not "failed", after the first miss.
    expect(result.current.status).toBe("loading");

    getEquipment.mockResolvedValue([{ index: "explorers-pack", name: "Explorer's Pack" }]);
    getMagicItems.mockResolvedValue([]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RETRY_DELAYS[1] + 50);
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.findMatches("Explorer's Pack").length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it("only says failed after every retry has missed, and can be tried again by hand", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getEquipment.mockRejectedValue(new Error("down"));
    getMagicItems.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useSrdEquipmentLookup());

    // One pause per retry; the status stays "loading" until the last one misses.
    for (const delay of RETRY_DELAYS) {
      expect(result.current.status).toBe("loading");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay + 50);
      });
    }
    expect(result.current.status).toBe("failed");
    expect(result.current.findMatches("Explorer's Pack")).toEqual([]);

    getEquipment.mockResolvedValue([{ index: "explorers-pack", name: "Explorer's Pack" }]);
    getMagicItems.mockResolvedValue([]);
    await act(async () => {
      result.current.retry();
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(result.current.status).toBe("ready");
    vi.useRealTimers();
  });

  it("is ready if at least one list loads", async () => {
    getEquipment.mockResolvedValue([{ index: "dagger", name: "Dagger" }]);
    getMagicItems.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useSrdEquipmentLookup());

    await waitFor(() => expect(result.current.status).toBe("ready"));
  });
});

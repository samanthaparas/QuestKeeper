import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveQueue } from "./useSaveQueue";
import { readSheetCache } from "../utils/sheetCache";
import { installFakeStorage } from "../test/fakeStorage";

function setup(save) {
  const onSaved = vi.fn();
  const hook = renderHook(() => useSaveQueue({ characterId: "c1", save, onSaved, baseUpdatedAt: () => "base" }));
  return { ...hook, onSaved };
}

const tick = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe("useSaveQueue", () => {
  beforeEach(() => {
    installFakeStorage();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("saves a moment after the last change, and the copy on this device says it's saved", async () => {
    const save = vi.fn().mockResolvedValue({ id: "c1", updatedAt: "t1" });
    const { result, onSaved } = setup(save);

    act(() => result.current.queueSave({ id: "c1", hp: 5 }));
    expect(result.current.status).toBe("saving");
    // The copy is written straight away, marked "not saved yet".
    expect(readSheetCache("c1")).toMatchObject({ synced: false, baseUpdatedAt: "base" });
    expect(save).not.toHaveBeenCalled();

    await tick(700);
    expect(save).toHaveBeenCalledWith({ id: "c1", hp: 5 });
    expect(result.current.status).toBe("saved");
    expect(onSaved).toHaveBeenCalledWith({ id: "c1", updatedAt: "t1" });
    expect(readSheetCache("c1")).toMatchObject({ synced: true, baseUpdatedAt: "t1" });
  });

  it("saves only the last of several quick changes", async () => {
    const save = vi.fn().mockResolvedValue({ id: "c1", updatedAt: "t1" });
    const { result } = setup(save);
    act(() => result.current.queueSave({ id: "c1", hp: 5 }));
    await tick(200);
    act(() => result.current.queueSave({ id: "c1", hp: 4 }));
    await tick(700);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ id: "c1", hp: 4 });
  });

  it("keeps the changes when a save fails, says so, and retries by itself until it works", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValue({ id: "c1", updatedAt: "t2" });
    const { result } = setup(save);

    act(() => result.current.queueSave({ id: "c1", hp: 2 }));
    await tick(700);
    expect(result.current.status).toBe("waiting");
    // Still safe on this device.
    expect(readSheetCache("c1")).toMatchObject({ synced: false, sheet: { hp: 2 } });

    await tick(4100);
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("waiting");

    await tick(8100);
    expect(save).toHaveBeenCalledTimes(3);
    expect(result.current.status).toBe("saved");
    expect(readSheetCache("c1")).toMatchObject({ synced: true, baseUpdatedAt: "t2" });
  });

  it("tries straight away when the connection comes back, or when asked", async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ id: "c1", updatedAt: "t3" });
    const { result } = setup(save);
    act(() => result.current.queueSave({ id: "c1" }));
    await tick(700);
    expect(result.current.status).toBe("waiting");

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    await tick(10);
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");

    save.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ id: "c1", updatedAt: "t4" });
    act(() => result.current.queueSave({ id: "c1", hp: 1 }));
    await tick(700);
    expect(result.current.status).toBe("waiting");
    await act(async () => result.current.retryNow());
    expect(result.current.status).toBe("saved");
  });

  it("saves the newest change when one arrives while an older one is still saving", async () => {
    let release;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ id: "c1", updatedAt: "t1" }); }))
      .mockResolvedValue({ id: "c1", updatedAt: "t2" });
    const { result } = setup(save);

    act(() => result.current.queueSave({ id: "c1", hp: 5 }));
    await tick(700);
    act(() => result.current.queueSave({ id: "c1", hp: 4 }));
    await act(async () => release());
    await tick(700);
    expect(save).toHaveBeenLastCalledWith({ id: "c1", hp: 4 });
    expect(result.current.status).toBe("saved");
  });

  it("doesn't keep retrying when the person is signed out", async () => {
    const save = vi.fn().mockRejectedValue(new Error("You are signed out. Log in to save changes."));
    const { result } = setup(save);
    act(() => result.current.queueSave({ id: "c1" }));
    await tick(700);
    expect(result.current.status).toBe("signed-out");
    await tick(120000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("says a refused save isn't allowed, and doesn't retry it like a lost connection", async () => {
    const refused = Object.assign(new Error("Only the player who owns this character can change it."), { code: "not_owner" });
    const save = vi.fn().mockRejectedValue(refused);
    const { result } = setup(save);
    act(() => result.current.queueSave({ id: "c1" }));
    await tick(700);
    expect(result.current.status).toBe("not-allowed");
    await tick(120000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("asks before the page closes while changes are unsaved, and not otherwise", async () => {
    const save = vi.fn().mockRejectedValue(new Error("offline"));
    const { result } = setup(save);

    const quiet = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(quiet);
    expect(quiet.defaultPrevented).toBe(false);

    act(() => result.current.queueSave({ id: "c1" }));
    const asking = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(asking);
    expect(asking.defaultPrevented).toBe(true);
  });
});

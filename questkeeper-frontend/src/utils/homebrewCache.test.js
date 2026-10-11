import { describe, it, expect, vi, beforeEach } from "vitest";

let sessionUser = null;
vi.mock("./supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: sessionUser ? { user: sessionUser } : null } }),
    },
  },
}));
vi.mock("./homebrewStore", () => ({ listVisibleHomebrew: vi.fn() }));

import { loadHomebrew, refreshHomebrew, primeHomebrew } from "./homebrewCache";
import { listVisibleHomebrew } from "./homebrewStore";

beforeEach(() => {
  vi.clearAllMocks();
  refreshHomebrew();
  sessionUser = { id: "me" };
  listVisibleHomebrew.mockResolvedValue([{ id: "r1" }]);
});

describe("homebrewCache", () => {
  it("is empty when nobody is logged in", async () => {
    sessionUser = null;
    expect(await loadHomebrew()).toEqual([]);
    expect(listVisibleHomebrew).not.toHaveBeenCalled();
  });

  it("loads once and reuses the list", async () => {
    await loadHomebrew();
    expect(await loadHomebrew()).toEqual([{ id: "r1" }]);
    expect(listVisibleHomebrew).toHaveBeenCalledTimes(1);
  });

  it("loads again after a refresh or a different login", async () => {
    await loadHomebrew();
    refreshHomebrew();
    await loadHomebrew();
    sessionUser = { id: "someone-else" };
    await loadHomebrew();
    expect(listVisibleHomebrew).toHaveBeenCalledTimes(3);
  });

  it("treats a failure as empty and tries again next time", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    listVisibleHomebrew.mockRejectedValueOnce(new Error("relation does not exist"));
    expect(await loadHomebrew()).toEqual([]);
    expect(await loadHomebrew()).toEqual([{ id: "r1" }]);
  });

  it("uses a list the My Homebrew page already has", async () => {
    primeHomebrew("me", [{ id: "fresh" }]);
    expect(await loadHomebrew()).toEqual([{ id: "fresh" }]);
    expect(listVisibleHomebrew).not.toHaveBeenCalled();
  });
});

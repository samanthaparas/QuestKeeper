import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const SPELLS = [{ index: "fireball", name: "Fireball", level: 3 }];

// A fresh copy of the controller each time, so each test starts with no
// saved spell list.
async function loadController() {
  vi.resetModules();
  return import("./spellsController.js");
}

function graphqlAnswer(spells) {
  return { ok: true, json: async () => ({ data: { spells } }) };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSpellList", () => {
  it("asks the D&D 5e API once, then answers from the saved copy", async () => {
    fetch.mockResolvedValue(graphqlAnswer(SPELLS));
    const { fetchSpellList } = await loadController();

    const [first, second] = await Promise.all([fetchSpellList(), fetchSpellList()]);
    const third = await fetchSpellList();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(first[0]).toMatchObject({ index: "fireball", url: "/api/2014/spells/fireball" });
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("doesn't keep a failure, so the next visitor tries again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetch.mockResolvedValue({ ok: false, status: 503 });
    const { fetchSpellList } = await loadController();

    await expect(fetchSpellList()).rejects.toThrow("Unable to retrieve spells.");

    fetch.mockResolvedValue(graphqlAnswer(SPELLS));
    await expect(fetchSpellList()).resolves.toHaveLength(1);
  });
});

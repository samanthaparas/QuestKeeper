import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const RAW = [
  { index: "goblin", name: "Goblin", challenge_rating: 0.25, xp: 50, type: "humanoid", size: "Small", hit_points: 7 },
  { index: "aboleth", name: "Aboleth", challenge_rating: 10, xp: 5900, type: "aberration", size: "Large", hit_points: 135 },
];

// A fresh copy each time, so each test starts with no saved list.
async function loadController() {
  vi.resetModules();
  return import("./monstersController.js");
}

const answer = (monsters) => ({ ok: true, json: async () => ({ data: { monsters } }) });

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMonsterList", () => {
  it("keeps just what an encounter needs, A to Z, and asks the API only once", async () => {
    fetch.mockResolvedValue(answer(RAW));
    const { fetchMonsterList } = await loadController();

    const [first, second] = await Promise.all([fetchMonsterList(), fetchMonsterList()]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.map((monster) => monster.name)).toEqual(["Aboleth", "Goblin"]);
    expect(first[1]).toEqual({
      index: "goblin",
      name: "Goblin",
      challengeRating: 0.25,
      xp: 50,
      type: "humanoid",
      size: "Small",
      hitPoints: 7,
    });
  });

  it("doesn't keep a failure, so the next visitor tries again", async () => {
    fetch.mockResolvedValue({ ok: false, status: 503 });
    const { fetchMonsterList } = await loadController();
    await expect(fetchMonsterList()).rejects.toThrow("Unable to retrieve monsters.");

    fetch.mockResolvedValue(answer(RAW));
    await expect(fetchMonsterList()).resolves.toHaveLength(2);
  });

  it("treats an empty answer as a failure", async () => {
    fetch.mockResolvedValue(answer([]));
    const { fetchMonsterList } = await loadController();
    await expect(fetchMonsterList()).rejects.toThrow("Unable to retrieve monsters.");
  });
});

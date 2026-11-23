import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getWeapons } from "./weaponsController.js";

// The weapon list for each edition, asked of the rules server. Its weapon
// category is "weapon" in 2014 and "weapons" in 2024.
function listAnswer(equipment) {
  return { ok: true, json: async () => ({ index: "x", name: "Weapons", equipment }) };
}

// Calls the route the way Express does and gives back what it answered.
async function callRoute(query) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  await getWeapons({ query }, res, next);
  return { res, next };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getWeapons", () => {
  it("asks for the 2014 'weapon' category and keeps its answer's shape", async () => {
    fetch.mockResolvedValue(listAnswer([{ index: "club", name: "Club", url: "/api/2014/equipment/club" }]));
    const { res, next } = await callRoute({ edition: "2014" });

    expect(fetch).toHaveBeenCalledWith("https://www.dnd5eapi.co/api/2014/equipment-categories/weapon");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: [{ index: "club", name: "Club", url: "/api/2014/equipment/club", edition: "2014" }],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("uses 2014 when no edition is given, as before", async () => {
    fetch.mockResolvedValue(listAnswer([]));
    await callRoute({});
    expect(fetch).toHaveBeenCalledWith("https://www.dnd5eapi.co/api/2014/equipment-categories/weapon");
  });

  it("asks for the 2024 'weapons' category and marks each weapon 2024", async () => {
    fetch.mockResolvedValue(listAnswer([{ index: "pistol", name: "Pistol", url: "/api/2024/equipment/pistol" }]));
    const { res } = await callRoute({ edition: "2024" });

    expect(fetch).toHaveBeenCalledWith("https://www.dnd5eapi.co/api/2024/equipment-categories/weapons");
    expect(res.json).toHaveBeenCalledWith({
      data: [{ index: "pistol", name: "Pistol", url: "/api/2024/equipment/pistol", edition: "2024" }],
    });
  });

  it("passes an upstream failure on as an error, never another edition's list", async () => {
    fetch.mockResolvedValue({ ok: false, status: 503 });
    const { res, next } = await callRoute({ edition: "2024" });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.message).toBe("Unable to retrieve weapons.");
    expect(error.statusCode).toBe(503);
  });
});

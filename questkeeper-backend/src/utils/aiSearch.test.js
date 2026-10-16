import { describe, it, expect, vi } from "vitest";
import {
  MAX_RESULTS,
  catalogText,
  cleanQuery,
  createRateLimiter,
  loadCatalog,
  pickResults,
} from "./aiSearch.js";

const catalog = [
  { id: "spell:cure-wounds", name: "Cure Wounds", category: "Spells" },
  { id: "spell:healing-word", name: "Healing Word", category: "Spells" },
  { id: "item:potion-of-healing", name: "Potion of Healing", category: "Magic Items" },
];

describe("AI search helpers", () => {
  it("builds the catalog with the app's own ids, skipping a list that fails", async () => {
    const fetchList = vi.fn(async (resource) => {
      if (resource === "races") throw new Error("down");
      return [{ index: `${resource}-one`, name: `${resource} one` }];
    });

    const entries = await loadCatalog(fetchList);

    expect(entries).toContainEqual({ id: "spell:spells-one", name: "spells one", category: "Spells" });
    expect(entries).toContainEqual({
      id: "background:2014:backgrounds-one",
      name: "backgrounds one",
      category: "Backgrounds",
    });
    expect(entries.some((entry) => entry.category === "Races")).toBe(false);
  });

  it("writes the catalog as id | name lines under each kind", () => {
    expect(catalogText(catalog)).toBe(
      "## Spells\nspell:cure-wounds | Cure Wounds\nspell:healing-word | Healing Word\n\n" +
        "## Magic Items\nitem:potion-of-healing | Potion of Healing",
    );
  });

  it("keeps only real catalog ids, once each, with names from the catalog", () => {
    const answer = JSON.stringify({
      results: [
        { id: "spell:cure-wounds", why: "Heals a creature you touch." },
        { id: "spell:made-up", why: "Not real." },
        { id: "spell:cure-wounds", why: "Again." },
        { id: "item:potion-of-healing", why: "Drink it to heal." },
      ],
    });

    expect(pickResults(answer, catalog)).toEqual([
      { ...catalog[0], why: "Heals a creature you touch." },
      { ...catalog[2], why: "Drink it to heal." },
    ]);
  });

  it("returns nothing for an answer that isn't JSON, and caps the list", () => {
    expect(pickResults("not json", catalog)).toEqual([]);

    const many = Array.from({ length: 12 }, (_, i) => ({ id: `spell:s${i}`, name: `S${i}`, category: "Spells" }));
    const answer = JSON.stringify({ results: many.map(({ id }) => ({ id, why: "fits" })) });
    expect(pickResults(answer, many)).toHaveLength(MAX_RESULTS);
  });

  it("tidies the query and refuses empty ones", () => {
    expect(cleanQuery("  heal   my friend ")).toBe("heal my friend");
    expect(cleanQuery(42)).toBe("");
    expect(cleanQuery("x".repeat(500))).toHaveLength(120);
  });

  it("limits each visitor's searches within the time window", () => {
    let time = 0;
    const allow = createRateLimiter({ limit: 2, windowMs: 1000, now: () => time });

    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(true);
    expect(allow("a")).toBe(false);
    expect(allow("b")).toBe(true);
    time = 1500;
    expect(allow("a")).toBe(true);
  });
});

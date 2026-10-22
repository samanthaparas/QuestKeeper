import { describe, it, expect } from "vitest";
import {
  MAX_ENTRY_LENGTH,
  MAX_RECAP_LENGTH,
  cleanEntries,
  cleanSession,
  pickRecap,
  recapPrompt,
} from "./recap.js";

describe("cleanEntries", () => {
  it("keeps the order, drops empty notes and names the author", () => {
    const cleaned = cleanEntries([
      { author: "Pippa", text: "  We found a door.  " },
      { author: "DM", text: "   " },
      { text: "Nobody signed this." },
    ]);
    expect(cleaned).toEqual([
      { author: "Pippa", text: "We found a door." },
      { author: "Someone", text: "Nobody signed this." },
    ]);
  });

  it("limits each note and the whole set", () => {
    const long = "x".repeat(MAX_ENTRY_LENGTH + 500);
    expect(cleanEntries([{ author: "A", text: long }])[0].text).toHaveLength(MAX_ENTRY_LENGTH);

    const many = Array.from({ length: 40 }, (_, index) => ({ author: "A", text: "y".repeat(1000) + index }));
    const cleaned = cleanEntries(many);
    expect(cleaned.length).toBeLessThan(40);
    expect(cleaned[0].text.endsWith("0")).toBe(true);
  });

  it("gives [] for anything that isn't a list", () => {
    expect(cleanEntries(null)).toEqual([]);
    expect(cleanEntries("hello")).toEqual([]);
  });
});

describe("cleanSession", () => {
  it("accepts whole numbers from 1 to 9999 only", () => {
    expect([1, "12", 9999].map(cleanSession)).toEqual([1, 12, 9999]);
    expect([0, -1, 1.5, "abc", null, 10000].map(cleanSession)).toEqual([null, null, null, null, null, null]);
  });
});

describe("recapPrompt", () => {
  it("lists the notes in order with who wrote each", () => {
    const prompt = recapPrompt({
      sessionNumber: 3,
      entries: [
        { author: "DM", text: "The bridge collapsed." },
        { author: "Pippa", text: "I caught the rope." },
      ],
    });
    expect(prompt).toContain("Session 3");
    expect(prompt.indexOf("[DM] The bridge collapsed.")).toBeLessThan(prompt.indexOf("[Pippa] I caught the rope."));
  });
});

describe("pickRecap", () => {
  it("returns the tidied recap text", () => {
    expect(pickRecap(JSON.stringify({ recap: "  Pippa caught the rope.  " }))).toBe("Pippa caught the rope.");
  });

  it("limits the length", () => {
    expect(pickRecap(JSON.stringify({ recap: "z".repeat(MAX_RECAP_LENGTH + 100) }))).toHaveLength(MAX_RECAP_LENGTH);
  });

  it("returns an empty string for an empty recap and null for a broken answer", () => {
    expect(pickRecap(JSON.stringify({ recap: "" }))).toBe("");
    expect(pickRecap("not json")).toBeNull();
    expect(pickRecap(JSON.stringify({ other: 1 }))).toBeNull();
  });
});

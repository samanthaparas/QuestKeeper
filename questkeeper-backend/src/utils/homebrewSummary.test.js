import { describe, it, expect } from "vitest";
import { cleanCategory, cleanText, copiesSource, pickSummary, summaryPrompt } from "./homebrewSummary.js";

const SOURCE =
  "Soft Step. Moss muffles your footsteps, so you have advantage on Dexterity (Stealth) checks made in forests.";

describe("cleanText and cleanCategory", () => {
  it("tidies spacing, keeps paragraph breaks and limits the length", () => {
    expect(cleanText("  a   b\r\n\r\n\r\n\r\nc  ")).toBe("a b\n\nc");
    expect(cleanText("x".repeat(30000))).toHaveLength(20000);
    expect(cleanText(42)).toBe("");
  });

  it("only allows the known categories", () => {
    expect(cleanCategory("race")).toBe("race");
    expect(cleanCategory("feat")).toBe("feat");
    expect(cleanCategory("spell")).toBe("");
  });
});

describe("summaryPrompt", () => {
  it("fences the pasted text off as material to summarize", () => {
    const prompt = summaryPrompt({ category: "race", name: "Moss Elf", text: "hello" });
    expect(prompt).toContain("Category: race");
    expect(prompt).toContain('"""\nhello\n"""');
  });
});

describe("copiesSource", () => {
  it("spots a long run of the same words", () => {
    expect(copiesSource("Moss muffles your footsteps, so you have advantage on checks.", SOURCE)).toBe(true);
  });

  it("lets short shared rules phrases through", () => {
    expect(copiesSource("Quiet in forests: advantage on stealth checks there.", SOURCE)).toBe(false);
    expect(copiesSource("advantage on Dexterity", SOURCE)).toBe(false);
  });
});

describe("pickSummary", () => {
  it("keeps clean summaries and trims them", () => {
    const answer = JSON.stringify({
      summary: "  A stealthy forest folk.  ",
      items: [{ name: "Soft Step", summary: "Sneaks well among trees." }],
    });
    expect(pickSummary(answer, SOURCE)).toEqual({
      summary: "A stealthy forest folk.",
      items: [{ name: "Soft Step", summary: "Sneaks well among trees." }],
      dropped: 0,
    });
  });

  it("drops anything that copies the pasted text, and counts it", () => {
    const answer = JSON.stringify({
      summary: "Fine summary.",
      items: [
        { name: "Soft Step", summary: "Moss muffles your footsteps, so you have advantage on Dexterity checks" },
        { name: "Soft Step", summary: "duplicate name" },
      ],
    });
    const picked = pickSummary(answer, SOURCE);
    expect(picked.items).toEqual([]);
    expect(picked.dropped).toBe(1);
    expect(picked.summary).toBe("Fine summary.");
  });

  it("skips empty and repeated items, and returns null for junk", () => {
    const answer = JSON.stringify({
      summary: "",
      items: [
        { name: "A", summary: "one" },
        { name: "a", summary: "again" },
        { name: "", summary: "no name" },
      ],
    });
    expect(pickSummary(answer, SOURCE).items).toEqual([{ name: "A", summary: "one" }]);
    expect(pickSummary("not json", SOURCE)).toBeNull();
  });
});

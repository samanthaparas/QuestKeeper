import { describe, it, expect } from "vitest";
import { RULES_WORDS, findRulesWord, splitRulesWords } from "./rulesWords";

const marked = (text) =>
  splitRulesWords(text)
    .filter((part) => typeof part !== "string")
    .map((part) => `${part.word.key}:${part.text}`);

describe("rules words", () => {
  it("keeps every meaning short, and every word findable by its forms", () => {
    for (const word of RULES_WORDS) {
      expect(word.meaning.length, word.name).toBeLessThan(170);
      for (const form of word.forms) expect(findRulesWord(form)).toBe(word);
    }
  });

  it("finds words in any case, the longest phrase first, once each", () => {
    expect(marked("Make a Dexterity saving throw with Advantage. On a failed saving throw, advantage ends.")).toEqual([
      "saving throw:saving throw",
      "advantage:Advantage",
    ]);
    expect(marked("Your spell save DC is 13. You know two cantrips.")).toEqual([
      "spell save DC:spell save DC",
      "cantrip:cantrips",
    ]);
  });

  it("only matches whole words, and AC and HP only in capitals", () => {
    expect(marked("The proneness of reactions")).toEqual(["reaction:reactions"]);
    expect(marked("a lack of hp, an acorn")).toEqual([]);
    expect(marked("Your AC rises and you regain 5 HP.")).toEqual(["armor class:AC", "hit points:HP"]);
  });

  it("leaves plain 'cover' alone but explains half cover", () => {
    expect(marked("Cover the door. It has half cover.")).toEqual(["half cover:half cover"]);
  });

  it("keeps the text intact around the words", () => {
    const parts = splitRulesWords("You are poisoned until the end.");
    expect(parts.map((part) => (typeof part === "string" ? part : part.text)).join("")).toBe(
      "You are poisoned until the end.",
    );
  });
});

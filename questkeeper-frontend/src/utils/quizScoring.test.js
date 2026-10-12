import { describe, it, expect } from "vitest";
import { BUILDS, QUESTIONS } from "./quizData";
import { answeredCount, leanFor, quizResults, topBuilds } from "./quizScoring";

// A tiny repeatable random number generator, so the simulation is stable.
function seeded(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function randomAnswers(random) {
  return QUESTIONS.map((question) => Math.floor(random() * question.answers.length));
}

describe("quiz data", () => {
  it("has 20 questions with four answers each, and builds that name real options", () => {
    expect(QUESTIONS).toHaveLength(20);
    for (const question of QUESTIONS) expect(question.answers).toHaveLength(4);
    for (const build of BUILDS) {
      expect(build.race.index, build.name).toBeTruthy();
      expect(build.background.index, build.name).toBeTruthy();
      expect(build.abilities).toHaveLength(2);
    }
    // Including a Tiefling Paladin, like Billie.
    expect(BUILDS.find((build) => build.id === "infernal-oathsworn")).toMatchObject({
      race: { index: "tiefling" },
      class: { index: "paladin" },
    });
  });
});

describe("quiz scoring", () => {
  it("picks three builds from three different classes", () => {
    const answers = QUESTIONS.map(() => 0);
    const picks = topBuilds(leanFor(answers));
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((pick) => pick.build.class.index)).size).toBe(3);
  });

  it("sends a sneaky, free-spirited player toward a rogue", () => {
    // In every question, the answer that scores the most "sneaky".
    const answers = QUESTIONS.map((question) => {
      const scores = question.answers.map(([, weights]) => (weights.sneaky ?? 0) + (weights.free ?? 0) / 2);
      return scores.indexOf(Math.max(...scores));
    });
    expect(topBuilds(leanFor(answers))[0].build.class.index).toBe("rogue");
  });

  it("gives every class a fair chance and every build a chance to show up", () => {
    const random = seeded(42);
    const bestByClass = {};
    const seen = new Set();
    for (let run = 0; run < 5000; run += 1) {
      const picks = topBuilds(leanFor(randomAnswers(random)));
      bestByClass[picks[0].build.class.index] = (bestByClass[picks[0].build.class.index] ?? 0) + 1;
      for (const pick of picks) seen.add(pick.build.id);
    }
    expect(seen.size).toBe(BUILDS.length);
    const counts = Object.values(bestByClass);
    expect(counts).toHaveLength(12);
    // No class wins more than about three times as often as the rarest.
    expect(Math.max(...counts) / Math.min(...counts)).toBeLessThan(3.5);
  });

  it("adds reasons, a subclass level, and book picks that don't repeat", () => {
    const random = seeded(7);
    const { chips, results } = quizResults(randomAnswers(random));
    expect(chips.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.subclassLevel).toBeGreaterThanOrEqual(1);
      expect(result.bookRace?.index).toMatch(/^book_/);
      expect(result.bookBackground?.index).toMatch(/^book_/);
      expect(result.bookSubclass.class.index).toBe(result.build.class.index);
    }
    expect(new Set(results.map((result) => result.bookRace.index)).size).toBe(3);
    expect(new Set(results.map((result) => result.bookBackground.index)).size).toBe(3);
  });

  it("counts skipped questions as unanswered", () => {
    expect(answeredCount([0, null, 2, null])).toBe(2);
  });

  it("says 'rather fight than juggle spells' when you and the build both avoid magic", async () => {
    const { reasonsFor } = await import("./quizScoring");
    const barbarian = BUILDS.find((build) => build.id === "storm-of-fury");
    const reasons = reasonsFor({ magic: -2, front: 1, free: 0, simple: 1, wild: 0 }, barbarian);
    expect(reasons).toContain("You'd rather fight than juggle spells.");
    expect(reasons).not.toContain("Magic is the fun part for you.");
  });
});

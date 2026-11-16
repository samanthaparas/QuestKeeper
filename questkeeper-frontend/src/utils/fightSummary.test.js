import { describe, it, expect } from "vitest";
import { FIGHT_END_MESSAGE, FIGHT_START_MESSAGE, buildFightSummary, fightEvents } from "./fightSummary";
import { NEW_ENCOUNTER_MESSAGE } from "./tableGuidance";

// Newest first, the way the table page loads the log.
const log = (...messages) => messages.reverse().map((message, index) => ({ id: index, message }));

const combatants = [
  { name: "Pippa", kind: "player" },
  { name: "Billie", kind: "player" },
  { name: "Victory", kind: "ally" },
  { name: "Brown Bear", kind: "monster" },
  { name: "StarShard Corpse (Shroom)", kind: "monster" },
];

describe("a fight's log lines", () => {
  it("are the lines since this fight began, oldest first", () => {
    const events = log("Old fight line.", FIGHT_START_MESSAGE, "First.", "Second.");
    expect(fightEvents(events)).toEqual(["First.", "Second."]);
  });

  it("stop at an earlier fight's end or a new encounter when there's no start line", () => {
    expect(fightEvents(log("Earlier.", FIGHT_END_MESSAGE, "Now."))).toEqual(["Now."]);
    expect(fightEvents(log("Earlier.", NEW_ENCOUNTER_MESSAGE, "Now."))).toEqual(["Now."]);
  });
});

describe("the fight summary", () => {
  it("sums up who fell, damage dealt and taken, healing and crits", () => {
    const events = log(
      "Something from before.",
      FIGHT_START_MESSAGE,
      "Pippa deals 12 damage to Brown Bear.",
      "Brown Bear is bloodied!",
      "Pippa takes 9 damage.",
      "Billie deals 14 damage (8 slashing, 6 radiant) to Brown Bear (critical hit).",
      "Brown Bear is down!",
      "Billie deals 5 damage to StarShard Corpse (Shroom).",
      "The DM denied Billie's attack (5 damage undone).",
      "Victory takes 7 damage.",
      "Victory is down!",
      "Victory recovers 4 HP.",
      "StarShard Corpse (Shroom) is down!",
      "Pippa takes 3 damage.",
    );
    expect(buildFightSummary({ events, combatants, rounds: 6 })).toBe(
      [
        "⚔️ Fight summary (6 rounds)",
        "Defeated: Brown Bear, StarShard Corpse (Shroom)",
        "Went down: Victory",
        "Damage dealt: Pippa 12, Billie 14",
        "Damage taken: Pippa 12, Victory 7",
        "Healing: Victory 4",
        "Critical hits: Billie (1)",
      ].join("\n"),
    );
  });

  it("is empty when nothing happened", () => {
    const events = log(FIGHT_START_MESSAGE, "Pippa ends their turn.");
    expect(buildFightSummary({ events, combatants, rounds: 1 })).toBe("");
  });

  it("never counts damage a monster takes as party damage, and says 1 round", () => {
    const events = log(FIGHT_START_MESSAGE, "Brown Bear takes 30 damage.", "Brown Bear is down!");
    expect(buildFightSummary({ events, combatants, rounds: 1 })).toBe(
      "⚔️ Fight summary (1 round)\nDefeated: Brown Bear",
    );
  });
});

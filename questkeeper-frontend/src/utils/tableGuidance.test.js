import { describe, it, expect } from "vitest";
import {
  NEW_ENCOUNTER_MESSAGE,
  getDmPrepSteps,
  getPlayerTableTip,
  hasActiveNudge,
  isHousekeepingMessage,
  latestGameEvent,
  nudgeMessage,
} from "./tableGuidance";

const player = (name, initiative = null) => ({
  kind: "player",
  name,
  initiative,
});
const monster = (name, initiative = null) => ({
  kind: "monster",
  name,
  initiative,
});

function summary(steps) {
  return steps.map(
    (step) =>
      `${step.id}:${step.done ? "done" : "todo"}${step.current ? "*" : ""}`,
  );
}

describe("getDmPrepSteps", () => {
  it("starts with sharing the join code on an empty table", () => {
    const steps = getDmPrepSteps({ combatants: [] });

    expect(summary(steps)).toEqual([
      "invite:todo*",
      "monsters:todo",
      "initiative:todo",
      "start:todo",
    ]);
    expect(steps[0].detail).toMatch(/Join a table/);
  });

  it("ticks off joined players and added monsters", () => {
    const steps = getDmPrepSteps({
      combatants: [player("Billie"), player("Rowan"), monster("Goblin 1")],
    });

    expect(summary(steps)).toEqual([
      "invite:done",
      "monsters:done",
      "initiative:todo*",
      "start:todo",
    ]);
    expect(steps[0].detail).toBe(
      "2 players have joined. More can join any time.",
    );
  });

  it("names who still needs to roll initiative, shortening long lists", () => {
    const steps = getDmPrepSteps({
      combatants: [
        player("Billie", 15),
        monster("Goblin 1"),
        monster("Goblin 2"),
        monster("Goblin 3"),
        monster("Goblin 4"),
        monster("Goblin 5"),
      ],
    });

    expect(steps[2].detail).toBe(
      "Still waiting on Goblin 1, Goblin 2, Goblin 3 and 2 more.",
    );
  });

  it("points at Start combat once everyone has rolled", () => {
    const steps = getDmPrepSteps({
      combatants: [player("Billie", 15), monster("Goblin", 9)],
    });

    expect(summary(steps)).toEqual([
      "invite:done",
      "monsters:done",
      "initiative:done",
      "start:todo*",
    ]);
  });

  it("marks everything done once combat is running", () => {
    const steps = getDmPrepSteps({
      combatants: [player("Billie", 15), monster("Goblin", 9)],
      combatActive: true,
    });

    expect(steps.every((step) => step.done && !step.current)).toBe(true);
  });
});

describe("getPlayerTableTip", () => {
  it("says nothing before the player has a row or an initiative", () => {
    expect(getPlayerTableTip({ me: undefined })).toBeNull();
    expect(getPlayerTableTip({ me: player("Billie") })).toBeNull();
  });

  it("reassures a player who has rolled and is waiting for the fight", () => {
    expect(getPlayerTableTip({ me: player("Billie", 12) })).toMatch(
      /You're ready/,
    );
  });

  it("explains where to attack on the player's turn", () => {
    expect(
      getPlayerTableTip({
        me: player("Billie", 12),
        combatActive: true,
        isMyTurn: true,
      }),
    ).toMatch(/open the Actions tab and tap Attack/);
  });

  it("explains the sheet banner while waiting for a turn", () => {
    expect(
      getPlayerTableTip({ me: player("Billie", 12), combatActive: true }),
    ).toMatch(/banner on your character sheet/);
  });
});

describe("hasActiveNudge", () => {
  const nudge = { message: nudgeMessage("Billie") };
  const reset = { message: NEW_ENCOUNTER_MESSAGE };
  const other = {
    message: "Billie attacks Kobold with Dagger (rolled 15). That hits!",
  };

  it("finds a nudge for that player", () => {
    expect(hasActiveNudge([other, nudge], "Billie")).toBe(true);
    expect(hasActiveNudge([nudge], "Rowan")).toBe(false);
  });

  it("ignores nudges from before the last new encounter", () => {
    expect(hasActiveNudge([reset, nudge], "Billie")).toBe(false);
    expect(hasActiveNudge([nudge, reset], "Billie")).toBe(true);
  });

  it("handles no events", () => {
    expect(hasActiveNudge(undefined, "Billie")).toBe(false);
  });
});

describe("latestGameEvent", () => {
  const attack = {
    id: "a",
    message: "Dangit attacks Goblin 4 with Dagger (rolled 15). That hits!",
  };

  it("skips nudges and the new-encounter marker for the turn banner", () => {
    const events = [
      { id: "n", message: nudgeMessage("Dangit") },
      { id: "r", message: NEW_ENCOUNTER_MESSAGE },
      attack,
    ];
    expect(latestGameEvent(events)).toBe(attack);
  });

  it("returns null when there is nothing but housekeeping", () => {
    expect(
      latestGameEvent([{ id: "n", message: nudgeMessage("Dangit") }]),
    ).toBeNull();
    expect(latestGameEvent()).toBeNull();
  });

  it("only treats real nudge lines as housekeeping", () => {
    expect(isHousekeepingMessage(nudgeMessage("Sir Pip"))).toBe(true);
    expect(isHousekeepingMessage("🔔 The bell tolls")).toBe(false);
    expect(isHousekeepingMessage(attack.message)).toBe(false);
  });
});

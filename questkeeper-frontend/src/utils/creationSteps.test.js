import { describe, it, expect } from "vitest";
import { getGroupStatus } from "./creationSteps";

const ALL_STEPS = ["name", "race", "subrace", "class", "review"];

describe("getGroupStatus", () => {
  it("is upcoming before the group's steps are reached", () => {
    const group = { label: "Ancestry", steps: ["race", "subrace"] };
    expect(getGroupStatus(group, ALL_STEPS, 0)).toBe("upcoming");
  });

  it("is current while inside any of the group's steps", () => {
    const group = { label: "Ancestry", steps: ["race", "subrace"] };
    expect(getGroupStatus(group, ALL_STEPS, 1)).toBe("current");
    expect(getGroupStatus(group, ALL_STEPS, 2)).toBe("current");
  });

  it("is complete once past all of the group's steps", () => {
    const group = { label: "Ancestry", steps: ["race", "subrace"] };
    expect(getGroupStatus(group, ALL_STEPS, 3)).toBe("complete");
  });

  it("handles a single-step group", () => {
    const group = { label: "Review", steps: ["review"] };
    expect(getGroupStatus(group, ALL_STEPS, 3)).toBe("upcoming");
    expect(getGroupStatus(group, ALL_STEPS, 4)).toBe("current");
  });

  it("returns upcoming if none of the group's steps exist in allSteps", () => {
    const group = { label: "Ghost", steps: ["notAStep"] };
    expect(getGroupStatus(group, ALL_STEPS, 2)).toBe("upcoming");
  });
});

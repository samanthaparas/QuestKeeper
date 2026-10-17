import { describe, it, expect } from "vitest";
import { getSetupTasks } from "./setupTasks";

const sheet = {
  level: 1,
  race: { id: "hb_r1", name: "Tabaxi" },
  background: { id: "acolyte", name: "Acolyte" },
  class: { id: "fighter", name: "Fighter" },
  features: [],
};

describe("getSetupTasks: homebrew drafts", () => {
  it("reminds the player to fill in a draft race, with a link to My Homebrew", () => {
    const homebrew = [{ id: "r1", category: "race", name: "Tabaxi", data: { needsDetails: true } }];
    const tasks = getSetupTasks(sheet, [], homebrew);
    expect(tasks).toEqual([
      expect.objectContaining({ key: "details:hb_r1", label: expect.stringContaining("Tabaxi"), to: "/homebrew" }),
    ]);
  });

  it("says nothing once the details have been saved, or for other picks", () => {
    const filledIn = [{ id: "r1", category: "race", name: "Tabaxi", data: {} }];
    expect(getSetupTasks(sheet, [], filledIn)).toEqual([]);
    expect(getSetupTasks(sheet, [])).toEqual([]);
  });
});

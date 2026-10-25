import { describe, it, expect, beforeEach } from "vitest";
import { installFakeStorage } from "../test/fakeStorage";
import {
  clearCreationDraft,
  hasCreationProgress,
  loadCreationDraft,
  saveCreationDraft,
} from "./creationDraft";

describe("the character in progress", () => {
  beforeEach(() => installFakeStorage());

  it("keeps a character once there's something to keep", () => {
    saveCreationDraft({ stepKey: "class", name: "Bram" }, 1000);
    expect(loadCreationDraft(2000)).toEqual({
      savedAt: 1000,
      fields: { stepKey: "class", name: "Bram" },
    });
  });

  it("keeps nothing for an empty first step", () => {
    saveCreationDraft({ stepKey: "name", name: "  " });
    expect(loadCreationDraft()).toBeNull();
    expect(hasCreationProgress({ race: { id: "elf" } })).toBe(true);
  });

  it("stops offering an abandoned draft after a month", () => {
    saveCreationDraft({ name: "Bram" }, 0);
    expect(loadCreationDraft(31 * 24 * 60 * 60 * 1000)).toBeNull();
  });

  it("clears it", () => {
    saveCreationDraft({ name: "Bram" });
    clearCreationDraft();
    expect(loadCreationDraft()).toBeNull();
  });
});

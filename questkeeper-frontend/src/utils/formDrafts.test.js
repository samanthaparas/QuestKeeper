import { describe, it, expect, beforeEach } from "vitest";
import { installFakeStorage } from "../test/fakeStorage";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "./formDrafts";

describe("unsaved writing", () => {
  beforeEach(() => installFakeStorage());

  it("comes back until it's cleared", () => {
    saveFormDraft("draft", { text: "The party met a goblin." }, 1000);
    expect(loadFormDraft("draft", 2000)).toEqual({ text: "The party met a goblin." });
    clearFormDraft("draft");
    expect(loadFormDraft("draft")).toBeNull();
  });

  it("isn't offered after a month", () => {
    saveFormDraft("draft", { text: "Old" }, 0);
    expect(loadFormDraft("draft", 31 * 24 * 60 * 60 * 1000)).toBeNull();
  });
});

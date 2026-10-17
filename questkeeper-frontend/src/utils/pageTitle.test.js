import { describe, it, expect } from "vitest";
import { getPageTitle } from "./pageTitle";

describe("getPageTitle", () => {
  it("names the page after its menu link", () => {
    expect(getPageTitle("/feats")).toBe("Feats \u00b7 QuestKeeper");
    expect(getPageTitle("/magic-items")).toBe("Magic Items \u00b7 QuestKeeper");
  });

  it("names a page under a link after that link", () => {
    expect(getPageTitle("/games/abc-123")).toBe("My Games \u00b7 QuestKeeper");
    expect(getPageTitle("/characters/new")).toBe("New Character \u00b7 QuestKeeper");
    expect(getPageTitle("/characters/xyz")).toBe("My Characters \u00b7 QuestKeeper");
  });

  it("falls back to the app name on Home and for unknown pages", () => {
    expect(getPageTitle("/")).toBe("QuestKeeper");
    expect(getPageTitle("/nope/nothing")).toBe("QuestKeeper");
  });
});

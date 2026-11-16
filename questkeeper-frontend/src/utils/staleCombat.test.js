import { describe, it, expect } from "vitest";
import { STALE_COMBAT_MS, describeQuiet, isStaleCombat } from "./staleCombat";

const NOW = new Date("2026-11-16T18:00:00Z").getTime();
const hoursAgo = (hours) => new Date(NOW - hours * 60 * 60 * 1000).toISOString();

describe("a forgotten fight", () => {
  it("is a fight still open with nothing happening for 3 hours or more", () => {
    expect(isStaleCombat({ combat_active: true }, hoursAgo(3), NOW)).toBe(true);
    expect(isStaleCombat({ combat_active: true }, hoursAgo(6 * 24), NOW)).toBe(true);
  });

  it("isn't a fight that's still going, or one that's over", () => {
    expect(isStaleCombat({ combat_active: true }, hoursAgo(2.5), NOW)).toBe(false);
    expect(isStaleCombat({ combat_active: false }, hoursAgo(100), NOW)).toBe(false);
    expect(isStaleCombat({ combat_active: true }, null, NOW)).toBe(false);
    expect(STALE_COMBAT_MS).toBe(3 * 60 * 60 * 1000);
  });

  it("says how long it's been quiet in plain words", () => {
    expect(describeQuiet(hoursAgo(1), NOW)).toBe("1 hour");
    expect(describeQuiet(hoursAgo(5), NOW)).toBe("5 hours");
    expect(describeQuiet(hoursAgo(24), NOW)).toBe("1 day");
    expect(describeQuiet(hoursAgo(6 * 24 + 3), NOW)).toBe("6 days");
  });
});

import { describe, it, expect } from "vitest";
import {
  emptyStatBlock,
  readStatBlock,
  cleanStatBlock,
  numberedNames,
  pieceNames,
  splitIcon,
  withIcon,
  recentEventsFor,
} from "./statBlock";

describe("readStatBlock", () => {
  it("handles an empty or missing stat block", () => {
    expect(readStatBlock(undefined)).toEqual({ attacks: [], notes: "" });
    expect(readStatBlock({})).toEqual(emptyStatBlock());
  });

  it("turns saved attacks into form text", () => {
    const form = readStatBlock({
      attacks: [{ name: "Claw", toHit: 4, damage: "1d6+2" }],
      notes: "Fast",
    });

    expect(form).toEqual({
      attacks: [{ name: "Claw", toHit: "4", damage: "1d6+2" }],
      notes: "Fast",
    });
  });
});

describe("cleanStatBlock", () => {
  it("drops unnamed attacks and converts to-hit to a number", () => {
    const saved = cleanStatBlock({
      attacks: [
        { name: " Claw ", toHit: "4", damage: " 1d6+2 " },
        { name: "", toHit: "9", damage: "1d4" },
      ],
      notes: "  Fast  ",
    });

    expect(saved).toEqual({
      attacks: [{ name: "Claw", toHit: 4, damage: "1d6+2" }],
      notes: "Fast",
    });
  });

  it("treats a blank or invalid to-hit as 0", () => {
    expect(cleanStatBlock({ attacks: [{ name: "Bite", toHit: "", damage: "" }] }).attacks[0].toHit).toBe(0);
  });
});

describe("numberedNames", () => {
  it("keeps a single name plain", () => {
    expect(numberedNames("Ogre", 1)).toEqual(["Ogre"]);
  });

  it("numbers a group", () => {
    expect(numberedNames("Goblin", 3)).toEqual(["Goblin 1", "Goblin 2", "Goblin 3"]);
  });

  it("clamps the count to 1-20 and ignores junk", () => {
    expect(numberedNames("Rat", 99)).toHaveLength(20);
    expect(numberedNames("Rat", 0)).toEqual(["Rat"]);
    expect(numberedNames("Rat", "abc")).toEqual(["Rat"]);
  });
});

describe("recentEventsFor", () => {
  const events = [
    { id: "1", message: "Dangit deals 4 damage to Kobold." },
    { id: "2", message: "Kobold is bloodied!" },
    { id: "3", message: "Dangit attacks Kobold 2 with Dagger (rolled 14). That hits!" },
    { id: "4", message: "Billie ends their turn." },
  ];

  it("returns the newest lines that mention the fighter", () => {
    expect(recentEventsFor(events, "Kobold").map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("does not match a longer name that starts the same way", () => {
    expect(recentEventsFor(events, "Kobold 2").map((e) => e.id)).toEqual(["3"]);
  });

  it("limits how many it returns", () => {
    expect(recentEventsFor(events, "Kobold", 1)).toHaveLength(1);
  });

  it("is safe with special characters and blank names", () => {
    expect(recentEventsFor(events, "(Ogre?)")).toEqual([]);
    expect(recentEventsFor(events, "   ")).toEqual([]);
  });
});

describe("pieceNames", () => {
  it("falls back to numbers when no piece details are given", () => {
    expect(pieceNames("Goblin", 2)).toEqual(["Goblin 1", "Goblin 2"]);
  });

  it("adds a nickname and an icon to the pieces that have them", () => {
    expect(
      pieceNames("Goblin", 3, [
        { icon: "🦆", label: "red duck" },
        { icon: "", label: "" },
        { icon: "🐧", label: "" },
      ]),
    ).toEqual(["🦆 Goblin (red duck)", "Goblin 2", "🐧 Goblin 3"]);
  });

  it("keeps a single monster's plain name unless it has an icon or nickname", () => {
    expect(pieceNames("Ogre", 1)).toEqual(["Ogre"]);
    expect(pieceNames("Ogre", 1, [{ icon: "🐻", label: "" }])).toEqual(["🐻 Ogre"]);
  });

  it("never goes over the 80 character name limit", () => {
    const [name] = pieceNames("G".repeat(70), 1, [{ icon: "🦆", label: "x".repeat(30) }]);
    expect(Array.from(name).length).toBeLessThanOrEqual(80);
  });
});

describe("splitIcon and withIcon", () => {
  it("separates a leading icon from the name and puts it back", () => {
    expect(splitIcon("🦆 Goblin (red duck)")).toEqual({ icon: "🦆", text: "Goblin (red duck)" });
    expect(withIcon("Goblin (red duck)", "🦆")).toBe("🦆 Goblin (red duck)");
  });

  it("leaves a plain name alone", () => {
    expect(splitIcon("Goblin 2")).toEqual({ icon: "", text: "Goblin 2" });
    expect(withIcon("Goblin 2", "")).toBe("Goblin 2");
  });
});

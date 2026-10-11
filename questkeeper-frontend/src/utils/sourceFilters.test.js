import { describe, it, expect } from "vitest";
import {
  getSourceLabel,
  getSourceOptions,
  filterBySource,
  groupBySource,
} from "./sourceFilters";

const races = [
  { name: "Elf", source: "SRD 5.1" },
  { name: "Catfolk", source: "Tome of Heroes" },
  { name: "Drow", source: "Tome of Heroes" },
  { name: "Stoor Halfling", source: "Open5e Originals" },
];

describe("sourceFilters", () => {
  it("treats entries without a source as SRD", () => {
    expect(getSourceLabel({ name: "Fireball" })).toBe("SRD");
  });

  it("counts each source, SRD first then A-Z", () => {
    expect(getSourceOptions(races)).toEqual([
      { source: "SRD 5.1", count: 1 },
      { source: "Open5e Originals", count: 1 },
      { source: "Tome of Heroes", count: 2 },
    ]);
  });

  it("filters to one source, or keeps everything for 'all'", () => {
    expect(filterBySource(races, "Tome of Heroes").map((r) => r.name)).toEqual([
      "Catfolk",
      "Drow",
    ]);
    expect(filterBySource(races, "all")).toBe(races);
    expect(filterBySource(races)).toBe(races);
  });

  it("groups entries by source", () => {
    expect(
      groupBySource(races).map(({ source, items }) => [source, items.length]),
    ).toEqual([
      ["SRD 5.1", 1],
      ["Open5e Originals", 1],
      ["Tome of Heroes", 2],
    ]);
  });
});

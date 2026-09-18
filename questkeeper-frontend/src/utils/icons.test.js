import { describe, it, expect } from "vitest";
import {
  getRaceIcon,
  getClassIcon,
  getBackgroundIcon,
  getSpellSchoolIcon,
  getSpellEffectIcon,
  getUiIcon,
} from "./icons";

describe("getRaceIcon", () => {
  it("resolves a known race id", () => {
    expect(getRaceIcon("half-elf")).toBeTruthy();
  });

  it("normalizes a display-cased name", () => {
    expect(getRaceIcon("Half-Elf")).toBe(getRaceIcon("half-elf"));
  });

  it("returns undefined for an unknown id", () => {
    expect(getRaceIcon("not-a-race")).toBeUndefined();
  });
});

describe("getClassIcon", () => {
  it("resolves a known class id", () => {
    expect(getClassIcon("wizard")).toBeTruthy();
  });
});

describe("getBackgroundIcon", () => {
  it("normalizes a spaced display name", () => {
    expect(getBackgroundIcon("Guild Artisan")).toBe(
      getBackgroundIcon("guild-artisan"),
    );
  });
});

describe("getSpellSchoolIcon", () => {
  it("resolves a known school id", () => {
    expect(getSpellSchoolIcon("evocation")).toBeTruthy();
  });
});

describe("getSpellEffectIcon", () => {
  it("resolves a known effect id", () => {
    expect(getSpellEffectIcon("healing")).toBeTruthy();
  });
});

describe("getUiIcon", () => {
  it("resolves a known ui icon id", () => {
    expect(getUiIcon("dice")).toBeTruthy();
  });
});

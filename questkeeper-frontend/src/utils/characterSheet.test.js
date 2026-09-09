import { describe, it, expect } from "vitest";
import {
  getAbilityModifier,
  getProficiencyBonus,
  applyRaceBonuses,
  getStartingHitPoints,
  getStartingArmorClass,
  applyAbilityScoreChoice,
  finalizeLevelUp,
  buildLevelUpSummary,
  createResource,
  setResourceCurrent,
  removeResource,
  updateResource,
  setCurrentHp,
  applyRest,
  createEquipmentItem,
  updateEquipmentItem,
  createAttack,
  updateAttack,
  createFeat,
  updateFeat,
  updateSpell,
} from "./characterSheet";

describe("getAbilityModifier", () => {
  it("matches the 5e modifier table", () => {
    expect(getAbilityModifier(10)).toBe(0);
    expect(getAbilityModifier(11)).toBe(0);
    expect(getAbilityModifier(8)).toBe(-1);
    expect(getAbilityModifier(15)).toBe(2);
    expect(getAbilityModifier(20)).toBe(5);
  });
});

describe("getProficiencyBonus", () => {
  it("matches the 5e proficiency bonus table", () => {
    expect(getProficiencyBonus(1)).toBe(2);
    expect(getProficiencyBonus(4)).toBe(2);
    expect(getProficiencyBonus(5)).toBe(3);
    expect(getProficiencyBonus(9)).toBe(4);
    expect(getProficiencyBonus(17)).toBe(6);
  });
});

describe("getStartingHitPoints", () => {
  it("adds the CON modifier to the hit die", () => {
    expect(getStartingHitPoints(8, 2)).toBe(10);
  });

  it("never goes below 1, even with a very negative modifier", () => {
    expect(getStartingHitPoints(4, -6)).toBe(1);
  });
});

describe("getStartingArmorClass", () => {
  it("is 10 plus the DEX modifier", () => {
    expect(getStartingArmorClass(3)).toBe(13);
    expect(getStartingArmorClass(-1)).toBe(9);
  });
});

describe("applyRaceBonuses", () => {
  const baseScores = {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 10,
    charisma: 8,
  };

  it("applies flat ability score increases (e.g. Human)", () => {
    const human = {
      abilityScoreIncreases: {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        charisma: 1,
      },
    };

    expect(applyRaceBonuses(baseScores, human).charisma).toBe(9);
  });

  it("applies chosen flexible bonuses on top of flat ones (e.g. Half-Elf)", () => {
    const halfElf = {
      abilityScoreIncreases: { charisma: 2 },
      abilityScoreChoice: {
        choose: 2,
        options: [
          { ability: "strength", bonus: 1 },
          { ability: "wisdom", bonus: 1 },
        ],
      },
    };

    const result = applyRaceBonuses(baseScores, halfElf, [
      "strength",
      "wisdom",
    ]);

    expect(result.charisma).toBe(10);
    expect(result.strength).toBe(16);
    expect(result.wisdom).toBe(11);
  });
});

describe("applyAbilityScoreChoice", () => {
  const scores = { strength: 15, dexterity: 14, constitution: 13 };

  it("adds +2 to one ability for asi-one", () => {
    const result = applyAbilityScoreChoice(scores, {
      type: "asi-one",
      ability: "strength",
    });
    expect(result.strength).toBe(17);
  });

  it("adds +1 each to two abilities for asi-two", () => {
    const result = applyAbilityScoreChoice(scores, {
      type: "asi-two",
      abilities: ["dexterity", "constitution"],
    });
    expect(result.dexterity).toBe(15);
    expect(result.constitution).toBe(14);
  });

  it("returns an unchanged copy when there's no choice (feat instead)", () => {
    expect(applyAbilityScoreChoice(scores, null)).toEqual(scores);
  });
});

describe("createResource", () => {
  it("creates a resource with current equal to max", () => {
    const resource = createResource({
      name: "Channel Divinity",
      max: 1,
      resetOn: "long",
    });

    expect(resource.name).toBe("Channel Divinity");
    expect(resource.max).toBe(1);
    expect(resource.current).toBe(1);
    expect(resource.resetOn).toBe("long");
    expect(resource.id).toBeTruthy();
  });
});

describe("setResourceCurrent", () => {
  const resources = [
    { id: "a", name: "Channel Divinity", max: 1, current: 1, resetOn: "long" },
    { id: "b", name: "Second Wind", max: 1, current: 1, resetOn: "short" },
  ];

  it("updates only the matching resource", () => {
    const result = setResourceCurrent(resources, "a", 0);

    expect(result.find((r) => r.id === "a").current).toBe(0);
    expect(result.find((r) => r.id === "b").current).toBe(1);
  });

  it("clamps the value between 0 and max", () => {
    expect(setResourceCurrent(resources, "a", -5)[0].current).toBe(0);
    expect(setResourceCurrent(resources, "a", 99)[0].current).toBe(1);
  });

  it("treats a missing resources list as empty", () => {
    expect(setResourceCurrent(undefined, "a", 1)).toEqual([]);
  });
});

describe("removeResource", () => {
  const resources = [
    { id: "a", name: "Channel Divinity", max: 1, current: 1, resetOn: "long" },
    { id: "b", name: "Second Wind", max: 1, current: 1, resetOn: "short" },
  ];

  it("removes only the matching resource", () => {
    const result = removeResource(resources, "a");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });
});

describe("setCurrentHp", () => {
  it("clamps between 0 and max", () => {
    const hitPoints = { max: 20, current: 5, temporary: 0 };

    expect(setCurrentHp(hitPoints, 15).current).toBe(15);
    expect(setCurrentHp(hitPoints, -3).current).toBe(0);
    expect(setCurrentHp(hitPoints, 50).current).toBe(20);
  });
});

describe("applyRest", () => {
  function makeSheet() {
    return {
      combat: { hitPoints: { max: 20, current: 5, temporary: 0 } },
      resources: [
        {
          id: "a",
          name: "Channel Divinity",
          max: 1,
          current: 0,
          resetOn: "long",
        },
        { id: "b", name: "Second Wind", max: 1, current: 0, resetOn: "short" },
      ],
    };
  }

  it("a long rest restores HP to max and every resource", () => {
    const result = applyRest(makeSheet(), "long");

    expect(result.combat.hitPoints.current).toBe(20);
    expect(result.resources.every((r) => r.current === r.max)).toBe(true);
  });

  it("a short rest only restores short-rest resources and leaves HP alone", () => {
    const result = applyRest(makeSheet(), "short");

    expect(result.combat.hitPoints.current).toBe(5);
    expect(result.resources.find((r) => r.id === "a").current).toBe(0);
    expect(result.resources.find((r) => r.id === "b").current).toBe(1);
  });
});

describe("finalizeLevelUp", () => {
  function makeSheet() {
    return {
      level: 1,
      abilityScores: { constitution: 14 }, // +2 modifier
      class: { spellcastingType: "known" },
      spellcasting: null,
      feats: [],
      combat: {
        hitPoints: { max: 8, current: 8, temporary: 0 },
        hitDice: { total: 1, remaining: 1, die: 6 },
        hpHistory: [],
      },
      pendingLevelUp: {
        targetLevel: 2,
        steps: [
          { key: "hitPoints", data: { amount: 4 } },
          {
            key: "spells",
            data: {
              spellIndex: "fire-bolt",
              spellName: "Fire Bolt",
              spellLevel: 0,
            },
          },
        ],
      },
    };
  }

  it("adds hit points (roll/average + CON modifier) and increments hit dice", () => {
    const result = finalizeLevelUp(makeSheet());

    expect(result.combat.hitPoints.max).toBe(14); // 8 + (4 + 2)
    expect(result.combat.hitDice.total).toBe(2);
    expect(result.level).toBe(2);
  });

  it("adds a new cantrip to cantripsKnown, not spellsKnown", () => {
    const result = finalizeLevelUp(makeSheet());

    expect(result.spellcasting.cantripsKnown).toHaveLength(1);
    expect(result.spellcasting.spellsKnown).toHaveLength(0);
    expect(result.spellcasting.cantripsKnown[0].name).toBe("Fire Bolt");
  });

  it("clears pendingLevelUp once applied", () => {
    const result = finalizeLevelUp(makeSheet());
    expect(result.pendingLevelUp).toBeNull();
  });
});

describe("buildLevelUpSummary", () => {
  function baseSheet(overrides = {}) {
    return {
      level: 1,
      abilityScores: { strength: 15, dexterity: 14 },
      feats: [],
      combat: { hitPoints: { max: 8 } },
      spellcasting: null,
      ...overrides,
    };
  }

  it("reports a newly learned cantrip even when leveled spells are already known", () => {
    const before = baseSheet({
      spellcasting: {
        cantripsKnown: [{ index: "fire-bolt", name: "Fire Bolt" }],
        spellsKnown: [{ index: "magic-missile", name: "Magic Missile" }],
      },
    });

    const after = baseSheet({
      level: 2,
      spellcasting: {
        cantripsKnown: [
          { index: "fire-bolt", name: "Fire Bolt" },
          { index: "mage-hand", name: "Mage Hand" },
        ],
        spellsKnown: [{ index: "magic-missile", name: "Magic Missile" }],
      },
    });

    expect(buildLevelUpSummary(before, after).newSpell.name).toBe("Mage Hand");
  });

  it("reports a newly learned leveled spell", () => {
    const before = baseSheet({
      spellcasting: { cantripsKnown: [], spellsKnown: [] },
    });

    const after = baseSheet({
      spellcasting: {
        cantripsKnown: [],
        spellsKnown: [{ index: "shield", name: "Shield" }],
      },
    });

    expect(buildLevelUpSummary(before, after).newSpell.name).toBe("Shield");
  });

  it("reports no new spell when nothing was learned", () => {
    const before = baseSheet({ spellcasting: null });
    const after = baseSheet({ spellcasting: null });

    expect(buildLevelUpSummary(before, after).newSpell).toBeNull();
  });
});

describe("createAttack", () => {
  it("creates an attack with the given fields", () => {
    const attack = createAttack({
      name: "Night Terror Longsword",
      toHit: 13,
      damage: "2d8+10",
      damageType: "Slashing",
      notes: "Demons & Undead take additional 2d10 radiant damage.",
    });

    expect(attack.name).toBe("Night Terror Longsword");
    expect(attack.toHit).toBe(13);
    expect(attack.damage).toBe("2d8+10");
    expect(attack.damageType).toBe("Slashing");
    expect(attack.notes).toBe(
      "Demons & Undead take additional 2d10 radiant damage.",
    );
    expect(attack.index).toBeTruthy();
  });

  it("defaults toHit to 0 and the text fields to empty strings", () => {
    const attack = createAttack({ name: "Fists" });

    expect(attack.toHit).toBe(0);
    expect(attack.damage).toBe("");
    expect(attack.damageType).toBe("");
    expect(attack.notes).toBe("");
  });
});

describe("updateAttack", () => {
  const attacks = [
    {
      index: "a",
      name: "Javelin",
      toHit: 10,
      damage: "1d6+5",
      damageType: "Piercing",
      notes: "",
    },
    {
      index: "b",
      name: "Longsword",
      toHit: 13,
      damage: "2d8+10",
      damageType: "Slashing",
      notes: "",
    },
  ];

  it("updates only the matching attack", () => {
    const result = updateAttack(attacks, "a", { toHit: 11 });

    expect(result.find((a) => a.index === "a").toHit).toBe(11);
    expect(result.find((a) => a.index === "b").toHit).toBe(13);
  });

  it("merges partial updates without dropping other fields", () => {
    const result = updateAttack(attacks, "b", {
      notes: "Bonus radiant damage",
    });
    const updated = result.find((a) => a.index === "b");

    expect(updated.notes).toBe("Bonus radiant damage");
    expect(updated.damage).toBe("2d8+10");
    expect(updated.name).toBe("Longsword");
  });
});

describe("createEquipmentItem", () => {
  it("creates an item with the given quantity and description", () => {
    const item = createEquipmentItem({
      name: "Marked cards",
      quantity: 10,
      description: "regular cards",
    });

    expect(item.name).toBe("Marked cards");
    expect(item.quantity).toBe(10);
    expect(item.description).toBe("regular cards");
    expect(item.index).toBeTruthy();
  });

  it("defaults quantity to 1 when missing, zero, or negative", () => {
    expect(createEquipmentItem({ name: "Rope" }).quantity).toBe(1);
    expect(createEquipmentItem({ name: "Rope", quantity: 0 }).quantity).toBe(1);
    expect(createEquipmentItem({ name: "Rope", quantity: -3 }).quantity).toBe(
      1,
    );
  });

  it("defaults description to an empty string", () => {
    expect(createEquipmentItem({ name: "Rope" }).description).toBe("");
  });
});

describe("updateEquipmentItem", () => {
  const equipment = [
    { index: "a", name: "Chain Mail", quantity: 1, description: "" },
    { index: "b", name: "Pouch", quantity: 1, description: "" },
  ];

  it("updates only the matching item", () => {
    const result = updateEquipmentItem(equipment, "a", { quantity: 2 });

    expect(result.find((i) => i.index === "a").quantity).toBe(2);
    expect(result.find((i) => i.index === "b").quantity).toBe(1);
  });
});

describe("createFeat", () => {
  it("creates a feat with a description", () => {
    const feat = createFeat({
      name: "Inspiring Leader",
      description: "3(Cha) + 12(current level) = 15 hit points",
    });

    expect(feat.name).toBe("Inspiring Leader");
    expect(feat.description).toBe("3(Cha) + 12(current level) = 15 hit points");
    expect(feat.index).toBeTruthy();
  });

  it("defaults description to an empty string", () => {
    expect(createFeat({ name: "Shield Master" }).description).toBe("");
  });
});

describe("updateFeat", () => {
  const feats = [
    { index: "a", name: "Shield Master", description: "" },
    { index: "b", name: "Inspiring Leader", description: "" },
  ];

  it("updates only the matching feat", () => {
    const result = updateFeat(feats, "b", { description: "Rally the party" });

    expect(result.find((f) => f.index === "b").description).toBe(
      "Rally the party",
    );
    expect(result.find((f) => f.index === "a").description).toBe("");
  });
});

describe("updateResource", () => {
  const resources = [
    {
      id: "a",
      name: "Lay on Hands",
      max: 65,
      current: 65,
      resetOn: "long",
      notes: "",
    },
    {
      id: "b",
      name: "Second Wind",
      max: 1,
      current: 0,
      resetOn: "short",
      notes: "",
    },
  ];

  it("updates fields on only the matching resource", () => {
    const result = updateResource(resources, "a", { name: "Healing Pool" });

    expect(result.find((r) => r.id === "a").name).toBe("Healing Pool");
    expect(result.find((r) => r.id === "b").name).toBe("Second Wind");
  });

  it("leaves current alone when max increases", () => {
    const result = updateResource(resources, "b", { max: 2 });
    const updated = result.find((r) => r.id === "b");

    expect(updated.max).toBe(2);
    expect(updated.current).toBe(0);
  });

  it("clamps current down when max shrinks below it", () => {
    const result = updateResource(resources, "a", { max: 10 });
    const updated = result.find((r) => r.id === "a");

    expect(updated.max).toBe(10);
    expect(updated.current).toBe(10);
  });
});

describe("updateSpell", () => {
  function makeSpellcasting() {
    return {
      type: "known",
      cantripsKnown: [{ index: "a", name: "Mage Hand", level: 0, notes: "" }],
      spellsKnown: [{ index: "b", name: "Bless", level: 1, notes: "" }],
    };
  }

  it("updates a spell without changing which list it's in", () => {
    const result = updateSpell(makeSpellcasting(), "spellsKnown", "b", {
      name: "Bless",
      level: 1,
      notes: "Pick 3 targets",
    });

    expect(result.spellsKnown).toHaveLength(1);
    expect(result.spellsKnown[0].notes).toBe("Pick 3 targets");
    expect(result.cantripsKnown).toHaveLength(1);
  });

  it("moves a spell into cantripsKnown when edited down to level 0", () => {
    const result = updateSpell(makeSpellcasting(), "spellsKnown", "b", {
      name: "Bless",
      level: 0,
      notes: "",
    });

    expect(result.spellsKnown).toHaveLength(0);
    expect(result.cantripsKnown).toHaveLength(2);
    expect(result.cantripsKnown.find((s) => s.index === "b").name).toBe(
      "Bless",
    );
  });

  it("moves a spell into spellsKnown when edited up from a cantrip", () => {
    const result = updateSpell(makeSpellcasting(), "cantripsKnown", "a", {
      name: "Mage Hand",
      level: 2,
      notes: "",
    });

    expect(result.cantripsKnown).toHaveLength(0);
    expect(result.spellsKnown).toHaveLength(2);
    expect(result.spellsKnown.find((s) => s.index === "a").level).toBe(2);
  });

  it("returns the spellcasting unchanged if the spell isn't found", () => {
    const spellcasting = makeSpellcasting();
    const result = updateSpell(spellcasting, "spellsKnown", "missing", {
      level: 0,
    });

    expect(result).toBe(spellcasting);
  });
});

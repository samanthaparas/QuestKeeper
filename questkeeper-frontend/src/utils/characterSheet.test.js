import { describe, it, expect } from "vitest";
import {
  getAbilityModifier,
  getProficiencyBonus,
  applyRaceBonuses,
  getRaceBonusPattern,
  canCustomizeRaceBonuses,
  isCustomRaceBonusComplete,
  applyCustomRaceBonuses,
  getStartingHitPoints,
  getStartingArmorClass,
  getSpellSaveDC,
  getSpellAttackModifier,
  applyAbilityScoreChoice,
  canIncreaseAbility,
  rollAbilityScore,
  rollD20,
  finalizeLevelUp,
  buildLevelUpSummary,
  createResource,
  createCompanionCreature,
  setResourceCurrent,
  removeResource,
  updateResource,
  setCurrentHp,
  setTemporaryHp,
  applyRest,
  takeShortRest,
  getHitDiceRemaining,
  getLongRestHitDice,
  describeSpellLock,
  createEquipmentItem,
  updateEquipmentItem,
  getAttunedCount,
  toggleSkillProficiency,
  cycleSkillProficiency,
  getSaveModifier,
  getEffectiveArmorClass,
  computeStartingArmorClass,
  buildStartingAttacks,
  findInventoryWeapons,
  getWeaponAttackMath,
  describeToHitMath,
  describeToHitBasics,
  splitMagicWeaponName,
  buildStartingLanguages,
  buildStartingProficiencies,
  isProficientWithWeapon,
  getSkillModifier,
  createAttack,
  updateAttack,
  createFeat,
  updateFeat,
  updateSpell,
  getSpellcastingAbility,
  getStartingSpellCounts,
  buildStartingSpellcasting,
  getFeatDescriptionLines,
  getSpellSlotProgression,
  mergeSubrace,
  getSubraceCantripTraitId,
  addRacialCantrip,
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

describe("getSpellSaveDC", () => {
  it("is 8 plus proficiency bonus plus ability modifier", () => {
    expect(getSpellSaveDC(16, 2)).toBe(13); // +3 mod, +2 prof
    expect(getSpellSaveDC(20, 6)).toBe(19); // +5 mod, +6 prof
  });
});

describe("getSpellAttackModifier", () => {
  it("is proficiency bonus plus ability modifier", () => {
    expect(getSpellAttackModifier(16, 2)).toBe(5);
    expect(getSpellAttackModifier(8, 3)).toBe(2);
  });
});

describe("getSpellcastingAbility", () => {
  it("returns the right ability for known caster classes", () => {
    expect(getSpellcastingAbility("wizard")).toBe("intelligence");
    expect(getSpellcastingAbility("paladin")).toBe("charisma");
  });

  it("returns null for non-caster classes", () => {
    expect(getSpellcastingAbility("fighter")).toBeNull();
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

describe("mergeSubrace", () => {
  it("merges the subrace's ability bonuses on top of the base race's", () => {
    const race = {
      name: "Elf",
      abilityScoreIncreases: { dexterity: 2 },
      traits: ["Darkvision"],
    };
    const subrace = {
      id: "high-elf",
      name: "High Elf",
      abilityScoreIncreases: { intelligence: 1 },
      traits: ["High Elf Cantrip"],
    };

    const result = mergeSubrace(race, subrace);

    expect(result.name).toBe("High Elf");
    expect(result.abilityScoreIncreases).toEqual({
      dexterity: 2,
      intelligence: 1,
    });
    expect(result.traits).toEqual(["Darkvision", "High Elf Cantrip"]);
  });

  it("returns the race unchanged when there is no subrace", () => {
    const race = { name: "Human", abilityScoreIncreases: {} };
    expect(mergeSubrace(race, null)).toBe(race);
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

describe("createCompanionCreature", () => {
  it("creates a companion creature with sensible defaults", () => {
    const creature = createCompanionCreature();

    expect(creature.name).toBe("");
    expect(creature.armorClass).toBe(10);
    expect(creature.speed).toBe(30);
    expect(creature.hitPoints).toEqual({ current: 0, max: 0 });
    expect(creature.notes).toBe("");
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

describe("setTemporaryHp", () => {
  it("sets temporary HP without touching current or max", () => {
    const hitPoints = { max: 20, current: 5, temporary: 0 };
    const result = setTemporaryHp(hitPoints, 8);

    expect(result).toEqual({ max: 20, current: 5, temporary: 8 });
  });

  it("never goes below zero and is not capped by max HP", () => {
    const hitPoints = { max: 20, current: 5, temporary: 3 };

    expect(setTemporaryHp(hitPoints, -4).temporary).toBe(0);
    expect(setTemporaryHp(hitPoints, 50).temporary).toBe(50);
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

  it("a long rest clears temporary HP, but a short rest keeps it", () => {
    const sheet = makeSheet();
    sheet.combat.hitPoints.temporary = 7;

    expect(applyRest(sheet, "long").combat.hitPoints.temporary).toBe(0);
    expect(applyRest(sheet, "short").combat.hitPoints.temporary).toBe(7);
  });

  it("a short rest only restores short-rest resources and leaves HP alone", () => {
    const result = applyRest(makeSheet(), "short");

    expect(result.combat.hitPoints.current).toBe(5);
    expect(result.resources.find((r) => r.id === "a").current).toBe(0);
    expect(result.resources.find((r) => r.id === "b").current).toBe(1);
  });

  it("a short rest recovers a Warlock's Pact Magic slots", () => {
    const sheet = {
      ...makeSheet(),
      class: { id: "warlock" },
      spellcasting: {
        spellSlots: [{ level: 2, max: 2, current: 0 }],
      },
    };

    const result = applyRest(sheet, "short");
    expect(result.spellcasting.spellSlots[0].current).toBe(2);
  });

  it("a short rest does not recover a non-Warlock's spell slots", () => {
    const sheet = {
      ...makeSheet(),
      class: { id: "wizard" },
      spellcasting: {
        spellSlots: [{ level: 1, max: 4, current: 0 }],
      },
    };

    const result = applyRest(sheet, "short");
    expect(result.spellcasting.spellSlots[0].current).toBe(0);
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

  it("saves a chosen feat with its name and SRD edition", () => {
    const sheet = makeSheet();
    sheet.pendingLevelUp.steps.push({
      key: "abilityOrFeat",
      data: { type: "feat", featName: "Grappler", featEdition: "2024" },
    });

    const [feat] = finalizeLevelUp(sheet).feats;

    expect(feat.name).toBe("Grappler");
    expect(feat.edition).toBe("2024");
  });

  it("gives the same feat taken at two level-ups a separate id each time", () => {
    const takeFeat = (sheet) =>
      finalizeLevelUp({
        ...sheet,
        pendingLevelUp: {
          targetLevel: sheet.level + 1,
          steps: [
            { key: "hitPoints", data: { amount: 4 } },
            {
              key: "abilityOrFeat",
              data: {
                type: "feat",
                featName: "Ability Score Improvement",
                featEdition: "2024",
              },
            },
          ],
        },
      });

    const feats = takeFeat(takeFeat(makeSheet())).feats;

    expect(feats).toHaveLength(2);
    expect(feats[0].index).not.toBe(feats[1].index);
  });

  it("recomputes spell slots for the new level using the class's progression", () => {
    const sheet = {
      level: 1,
      abilityScores: { constitution: 14 },
      class: { id: "wizard", spellcastingType: "prepared" },
      spellcasting: {
        type: "prepared",
        cantripsKnown: [],
        spellsKnown: [],
        spellSlots: [{ level: 1, max: 2, current: 0 }],
      },
      feats: [],
      combat: {
        hitPoints: { max: 8, current: 8, temporary: 0 },
        hitDice: { total: 1, remaining: 1, die: 6 },
        hpHistory: [],
      },
      pendingLevelUp: {
        targetLevel: 3,
        steps: [
          { key: "hitPoints", data: { amount: 4 } },
          { key: "spells", data: null },
        ],
      },
    };

    const result = finalizeLevelUp(sheet);
    const slots = result.spellcasting.spellSlots;

    expect(slots.find((s) => s.level === 1)).toEqual({
      level: 1,
      max: 4,
      current: 4,
    });
    expect(slots.find((s) => s.level === 2)).toEqual({
      level: 2,
      max: 2,
      current: 2,
    });
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

describe("getAttunedCount", () => {
  it("counts only items marked as attuned", () => {
    const equipment = [
      { index: "a", name: "Ring", attuned: true },
      { index: "b", name: "Cloak", attuned: false },
      { index: "c", name: "Amulet", attuned: true },
    ];

    expect(getAttunedCount(equipment)).toBe(2);
  });

  it("returns 0 for empty or missing equipment", () => {
    expect(getAttunedCount([])).toBe(0);
    expect(getAttunedCount(undefined)).toBe(0);
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

describe("getStartingSpellCounts", () => {
  it("gives known casters the API's cantrips_known and spells_known", () => {
    expect(
      getStartingSpellCounts("sorcerer", {
        cantrips_known: 4,
        spells_known: 2,
      }),
    ).toEqual({ cantrips: 4, spells: 2 });
  });

  it("gives the wizard a fixed 6-spell spellbook regardless of spells_known", () => {
    expect(getStartingSpellCounts("wizard", { cantrips_known: 3 })).toEqual({
      cantrips: 3,
      spells: 6,
    });
  });

  it("gives prepared casters like cleric/druid cantrips only, no fixed spell list", () => {
    expect(getStartingSpellCounts("cleric", { cantrips_known: 3 })).toEqual({
      cantrips: 3,
      spells: 0,
    });
  });

  it("returns zero for classes with no starting spellcasting at level 1", () => {
    expect(
      getStartingSpellCounts("paladin", { spell_slots_level_1: 0 }),
    ).toEqual({ cantrips: 0, spells: 0 });
  });

  it("returns zero when there is no level-one spellcasting data at all", () => {
    expect(getStartingSpellCounts("fighter", null)).toEqual({
      cantrips: 0,
      spells: 0,
    });
  });
});

describe("buildStartingSpellcasting", () => {
  it("builds cantripsKnown/spellsKnown entries from the chosen spell objects", () => {
    const result = buildStartingSpellcasting(
      "wizard",
      [{ index: "fire-bolt", name: "Fire Bolt", level: 0 }],
      [{ index: "magic-missile", name: "Magic Missile", level: 1 }],
    );

    expect(result.type).toBe("prepared");
    expect(result.cantripsKnown).toHaveLength(1);
    expect(result.cantripsKnown[0].name).toBe("Fire Bolt");
    expect(result.spellsKnown[0].name).toBe("Magic Missile");
  });

  it("returns null for a class with no spellcasting type", () => {
    expect(buildStartingSpellcasting("fighter", [], [])).toBeNull();
  });
});

describe("getSpellSlotProgression", () => {
  it("gives a level 1 full caster 2 first-level slots and nothing else", () => {
    const slots = getSpellSlotProgression("wizard", 1);
    expect(slots.find((s) => s.level === 1).max).toBe(2);
    expect(slots.filter((s) => s.level !== 1).every((s) => s.max === 0)).toBe(
      true,
    );
  });

  it("matches the full-caster table at level 17 (every spell level unlocked)", () => {
    const slots = getSpellSlotProgression("cleric", 17);
    expect(slots.map((s) => s.max)).toEqual([4, 3, 3, 3, 2, 1, 1, 1, 1]);
  });

  it("gives a level 1 half-caster no slots at all", () => {
    const slots = getSpellSlotProgression("paladin", 1);
    expect(slots.every((s) => s.max === 0)).toBe(true);
  });

  it("gives a half-caster the full-caster table's row at level ceil(L/2)", () => {
    expect(getSpellSlotProgression("ranger", 2).map((s) => s.max)).toEqual(
      getSpellSlotProgression("bard", 1).map((s) => s.max),
    );
    expect(getSpellSlotProgression("ranger", 7).map((s) => s.max)).toEqual(
      getSpellSlotProgression("bard", 4).map((s) => s.max),
    );
  });

  it("gives a Warlock all their slots at one scaling spell level", () => {
    const level5 = getSpellSlotProgression("warlock", 5);
    expect(level5.find((s) => s.level === 3).max).toBe(2);
    expect(level5.filter((s) => s.level !== 3).every((s) => s.max === 0)).toBe(
      true,
    );

    const level17 = getSpellSlotProgression("warlock", 17);
    expect(level17.find((s) => s.level === 5).max).toBe(4);
  });

  it("gives a non-caster class no slots at any level", () => {
    expect(
      getSpellSlotProgression("fighter", 20).every((s) => s.max === 0),
    ).toBe(true);
  });
});

describe("getSubraceCantripTraitId", () => {
  it("returns the trait id for High Elf", () => {
    expect(getSubraceCantripTraitId("high-elf")).toBe("high-elf-cantrip");
  });

  it("returns null for subraces without a cantrip trait", () => {
    expect(getSubraceCantripTraitId("hill-dwarf")).toBeNull();
  });
});

describe("addRacialCantrip", () => {
  it("adds the cantrip to an existing spellcasting object", () => {
    const spellcasting = {
      type: "prepared",
      cantripsKnown: [],
      spellsKnown: [],
    };
    const result = addRacialCantrip(spellcasting, {
      index: "light",
      name: "Light",
    });

    expect(result.cantripsKnown).toHaveLength(1);
    expect(result.cantripsKnown[0]).toMatchObject({ name: "Light", level: 0 });
  });

  it("locks the cantrip and records where it came from", () => {
    const result = addRacialCantrip(
      null,
      { index: "thaumaturgy", name: "Thaumaturgy" },
      "your race (Tiefling)",
    );
    expect(result.cantripsKnown[0]).toMatchObject({
      locked: true,
      grantedBy: "your race (Tiefling)",
    });
    expect(describeSpellLock(result.cantripsKnown[0])).toBe(
      "From your race (Tiefling)",
    );
  });

  it("creates a spellcasting object for a non-caster who otherwise has none", () => {
    const result = addRacialCantrip(null, { index: "light", name: "Light" });
    expect(result.cantripsKnown[0].name).toBe("Light");
    expect(result.spellsKnown).toEqual([]);
  });
});

describe("getFeatDescriptionLines", () => {
  it("returns the desc array as-is for a 2014-shaped feat", () => {
    const lines = getFeatDescriptionLines({ desc: ["Line one.", "Line two."] });
    expect(lines).toEqual(["Line one.", "Line two."]);
  });

  it("splits a 2024-shaped feat's description string on newlines", () => {
    const lines = getFeatDescriptionLines({
      description: "Line one.\nLine two.",
    });
    expect(lines).toEqual(["Line one.", "Line two."]);
  });

  it("returns an empty array when neither shape is present", () => {
    expect(getFeatDescriptionLines({})).toEqual([]);
  });
});

describe("rollAbilityScore", () => {
  it("rolls four d6 and sums the three highest", () => {
    const original = Math.random;
    const values = [0, 0.5, 0.99, 0.2]; // -> dice 1, 4, 6, 2
    let call = 0;
    Math.random = () => values[call++];

    const result = rollAbilityScore();

    Math.random = original;

    expect(result.rolls).toEqual([1, 4, 6, 2]);
    expect(result.droppedIndex).toBe(0);
    expect(result.total).toBe(12); // 4 + 6 + 2, dropping the 1
  });

  it("always returns a total between 3 and 18", () => {
    for (let i = 0; i < 50; i++) {
      const { total } = rollAbilityScore();
      expect(total).toBeGreaterThanOrEqual(3);
      expect(total).toBeLessThanOrEqual(18);
    }
  });
});

describe("rollD20", () => {
  function withRandom(values, roll) {
    const original = Math.random;
    let call = 0;
    Math.random = () => values[call++];
    try {
      return roll();
    } finally {
      Math.random = original;
    }
  }

  it("rolls one d20 normally", () => {
    expect(withRandom([0.5], () => rollD20())).toEqual({
      rolls: [11],
      result: 11,
    });
  });

  it("keeps the higher of two d20s with advantage", () => {
    expect(withRandom([0.1, 0.9], () => rollD20("advantage"))).toEqual({
      rolls: [3, 19],
      result: 19,
    });
  });

  it("keeps the lower of two d20s with disadvantage", () => {
    expect(withRandom([0.1, 0.9], () => rollD20("disadvantage"))).toEqual({
      rolls: [3, 19],
      result: 3,
    });
  });
});

describe("toggleSkillProficiency", () => {
  it("turns proficiency on for a skill that was off or missing", () => {
    expect(toggleSkillProficiency({}, "stealth")).toEqual({ stealth: true });
    expect(toggleSkillProficiency(undefined, "stealth")).toEqual({
      stealth: true,
    });
  });

  it("turns proficiency off for a skill that was on", () => {
    const result = toggleSkillProficiency({ stealth: true }, "stealth");

    expect(result.stealth).toBe(false);
  });

  it("leaves other skills alone and does not mutate the input", () => {
    const skills = { stealth: true, arcana: true };
    const result = toggleSkillProficiency(skills, "history");

    expect(result).toEqual({ stealth: true, arcana: true, history: true });
    expect(skills).toEqual({ stealth: true, arcana: true });
  });
});

describe("getSkillModifier with expertise and bonuses", () => {
  it("doubles the proficiency bonus for expertise", () => {
    // DEX 14 (+2), proficiency +3, expertise = +2 + 6
    expect(getSkillModifier(14, true, 3, { expertise: true })).toBe(8);
  });

  it("ignores expertise on a skill that is not proficient", () => {
    expect(getSkillModifier(14, false, 3, { expertise: true })).toBe(2);
  });

  it("adds a flat bonus, such as Jack of All Trades", () => {
    expect(getSkillModifier(10, false, 4, { bonus: 2 })).toBe(2);
    expect(getSkillModifier(10, true, 4, { bonus: -1 })).toBe(3);
  });
});

describe("getSaveModifier", () => {
  it("adds proficiency and a flat extra to the ability modifier", () => {
    // WIS 14 (+2) + proficiency 5 + Aura of Protection +3
    expect(getSaveModifier(14, true, 5, 3)).toBe(10);
    expect(getSaveModifier(10, false, 5, 3)).toBe(3);
    expect(getSaveModifier(10, false, 5)).toBe(0);
  });
});

describe("cycleSkillProficiency", () => {
  it("steps from none to proficient to expertise and back to none", () => {
    const first = cycleSkillProficiency({}, {}, "stealth");
    expect(first.skills.stealth).toBe(true);
    expect(first.skillExpertise.stealth).toBeUndefined();

    const second = cycleSkillProficiency(
      first.skills,
      first.skillExpertise,
      "stealth",
    );
    expect(second.skills.stealth).toBe(true);
    expect(second.skillExpertise.stealth).toBe(true);

    const third = cycleSkillProficiency(
      second.skills,
      second.skillExpertise,
      "stealth",
    );
    expect(third.skills.stealth).toBe(false);
    expect(third.skillExpertise.stealth).toBeUndefined();
  });

  it("handles sheets saved before expertise existed", () => {
    expect(
      cycleSkillProficiency(undefined, undefined, "arcana").skills,
    ).toEqual({
      arcana: true,
    });
  });
});

describe("getEffectiveArmorClass", () => {
  it("adds the temporary AC bonus to the base AC", () => {
    expect(
      getEffectiveArmorClass({ combat: { armorClass: 21 }, acBonus: 2 }),
    ).toBe(23);
  });

  it("works for sheets saved before the bonus existed", () => {
    expect(getEffectiveArmorClass({ combat: { armorClass: 14 } })).toBe(14);
    expect(getEffectiveArmorClass({})).toBe(10);
  });
});

describe("computeStartingArmorClass", () => {
  const scores = { strength: 15, dexterity: 14, constitution: 13, wisdom: 12 };
  const leather = {
    armor_category: "Light",
    armor_class: { base: 11, dex_bonus: true },
  };
  const chain = {
    armor_category: "Heavy",
    armor_class: { base: 16, dex_bonus: false },
  };
  const scale = {
    armor_category: "Medium",
    armor_class: { base: 14, dex_bonus: true, max_bonus: 2 },
  };
  const shield = {
    armor_category: "Shield",
    armor_class: { base: 2, dex_bonus: false },
  };

  it("adds Dex to light armor", () => {
    expect(
      computeStartingArmorClass({ gear: [leather], scores, classId: "bard" }),
    ).toBe(13);
  });

  it("ignores Dex for heavy armor and caps it for medium armor", () => {
    expect(
      computeStartingArmorClass({ gear: [chain], scores, classId: "paladin" }),
    ).toBe(16);
    expect(
      computeStartingArmorClass({
        gear: [scale],
        scores: { ...scores, dexterity: 18 },
        classId: "cleric",
      }),
    ).toBe(16);
  });

  it("adds a shield on top of armor or of no armor", () => {
    expect(
      computeStartingArmorClass({
        gear: [chain, shield],
        scores,
        classId: "paladin",
      }),
    ).toBe(18);
    expect(
      computeStartingArmorClass({ gear: [shield], scores, classId: "cleric" }),
    ).toBe(14);
  });

  it("uses 10 + Dex with nothing worn, and the unarmored formulas for Barbarian and Monk", () => {
    expect(
      computeStartingArmorClass({ gear: [], scores, classId: "fighter" }),
    ).toBe(12);
    expect(
      computeStartingArmorClass({ gear: [], scores, classId: "barbarian" }),
    ).toBe(13);
    expect(
      computeStartingArmorClass({ gear: [], scores, classId: "monk" }),
    ).toBe(13);
  });
});

describe("buildStartingAttacks", () => {
  const scores = { strength: 15, dexterity: 14 };
  const dagger = {
    name: "Dagger",
    weapon_category: "Simple",
    weapon_range: "Melee",
    damage: { damage_dice: "1d4", damage_type: { name: "Piercing" } },
    properties: [
      { index: "finesse", name: "Finesse" },
      { index: "monk", name: "Monk" },
    ],
    throw_range: { normal: 20, long: 60 },
    quantity: 2,
  };
  const longbow = {
    name: "Longbow",
    weapon_category: "Martial",
    weapon_range: "Ranged",
    damage: { damage_dice: "1d8", damage_type: { name: "Piercing" } },
    properties: [{ index: "ammunition", name: "Ammunition" }],
    range: { normal: 150, long: 600 },
  };

  it("works out to-hit and damage from the ability scores and proficiency", () => {
    const [attack] = buildStartingAttacks({
      gear: [dagger],
      scores,
      proficiencyNames: ["Simple Weapons"],
      proficiencyBonus: 2,
    });

    expect(attack).toMatchObject({
      name: "Dagger",
      toHit: 4,
      damage: "1d4+2",
      damageType: "Piercing",
    });
    expect(attack.notes).toBe("Quantity: 2 - Finesse - Range 20/60 ft");
  });

  it("uses Dex for ranged weapons and skips the proficiency bonus when untrained", () => {
    const [attack] = buildStartingAttacks({
      gear: [longbow],
      scores,
      proficiencyNames: ["Simple Weapons"],
    });
    expect(attack).toMatchObject({
      name: "Longbow",
      toHit: 2,
      damage: "1d8+2",
    });
  });

  it("leaves out armor and other gear", () => {
    expect(
      buildStartingAttacks({
        gear: [{ name: "Chain Mail", armor_category: "Heavy" }],
        scores,
      }),
    ).toEqual([]);
  });

  it("writes a negative modifier and drops a zero one", () => {
    const negative = buildStartingAttacks({
      gear: [longbow],
      scores: { dexterity: 8 },
    });
    expect(negative[0].damage).toBe("1d8-1");
    const zero = buildStartingAttacks({
      gear: [longbow],
      scores: { dexterity: 10 },
    });
    expect(zero[0].damage).toBe("1d8");
  });
});

describe("isProficientWithWeapon", () => {
  it("matches by category or by named weapon", () => {
    expect(
      isProficientWithWeapon({ name: "Club", weapon_category: "Simple" }, [
        "Simple Weapons",
      ]),
    ).toBe(true);
    expect(
      isProficientWithWeapon({ name: "Rapier", weapon_category: "Martial" }, [
        "Rapiers",
      ]),
    ).toBe(true);
    expect(
      isProficientWithWeapon(
        { name: "Crossbow, hand", weapon_category: "Martial" },
        ["Hand crossbows"],
      ),
    ).toBe(true);
    expect(
      isProficientWithWeapon({ name: "Greataxe", weapon_category: "Martial" }, [
        "Simple Weapons",
      ]),
    ).toBe(false);
  });
});

describe("buildStartingLanguages", () => {
  it("lists known languages and reminds about any left to choose", () => {
    expect(
      buildStartingLanguages({
        raceLanguages: [{ name: "Common" }, { name: "Elvish" }],
        raceChoices: 1,
        backgroundChoices: 2,
        backgroundName: "Acolyte",
      }),
    ).toBe(
      "Common, Elvish\nChoose 1 more (your race)\nChoose 2 more (Acolyte)",
    );
  });

  it("is blank when there is nothing to say", () => {
    expect(buildStartingLanguages({})).toBe("");
  });
});

describe("buildStartingProficiencies", () => {
  it("keeps armor, weapon and tool proficiencies but not saving throws or skills", () => {
    const entries = buildStartingProficiencies([
      { name: "Light Armor" },
      { name: "Simple Weapons" },
      { name: "Saving Throw: DEX" },
      { name: "Skill: Stealth" },
      { name: "Thieves' Tools" },
    ]);

    expect(entries.map((entry) => entry.name)).toEqual([
      "Light Armor",
      "Simple Weapons",
      "Thieves' Tools",
    ]);
    expect(entries[0]).toMatchObject({ description: "" });
    expect(entries[0].index).toBeTruthy();
  });
});

describe("findInventoryWeapons", () => {
  const weapons = [
    { index: "dagger", name: "Dagger" },
    { index: "longsword", name: "Longsword" },
    { index: "shortbow", name: "Shortbow" },
  ];

  it("finds inventory items that are SRD weapons", () => {
    const equipment = [
      { index: "1", name: "Dagger", quantity: 2 },
      { index: "2", name: "Rope, hempen (50 feet)" },
      { index: "3", name: " shortbow " },
    ];

    expect(
      findInventoryWeapons(equipment, weapons, []).map(
        (entry) => entry.weapon.index,
      ),
    ).toEqual(["dagger", "shortbow"]);
  });

  it("skips weapons that are already attacks, including named versions", () => {
    const equipment = [
      { index: "1", name: "Dagger" },
      { index: "2", name: "Longsword" },
    ];
    const attacks = [{ name: "dagger" }, { name: "Night Terror Longsword" }];

    expect(findInventoryWeapons(equipment, weapons, attacks)).toEqual([]);
  });

  it("lists a weapon once even if it appears twice in the inventory", () => {
    const equipment = [
      { index: "1", name: "Dagger" },
      { index: "2", name: "Dagger" },
    ];

    expect(findInventoryWeapons(equipment, weapons, [])).toHaveLength(1);
  });

  it("returns nothing before the weapon list has loaded", () => {
    expect(findInventoryWeapons([{ name: "Dagger" }], [], [])).toEqual([]);
  });
});

describe("getWeaponAttackMath", () => {
  const scores = { strength: 12, dexterity: 16 };
  const rapier = {
    name: "Rapier",
    weapon_category: "Martial",
    weapon_range: "Melee",
    damage: { damage_dice: "1d8" },
    properties: [{ index: "finesse", name: "Finesse" }],
  };
  const greataxe = {
    name: "Greataxe",
    weapon_category: "Martial",
    weapon_range: "Melee",
    damage: { damage_dice: "1d12" },
    properties: [],
  };

  it("adds the better of STR and DEX for finesse weapons, plus proficiency", () => {
    const math = getWeaponAttackMath({
      weapon: rapier,
      scores,
      proficiencyNames: ["Martial Weapons"],
      proficiencyBonus: 3,
    });

    expect(math).toMatchObject({
      ability: "dexterity",
      abilityMod: 3,
      proficient: true,
      toHit: 6,
      damage: "1d8+3",
    });
  });

  it("leaves out proficiency when the character isn't trained", () => {
    const math = getWeaponAttackMath({
      weapon: greataxe,
      scores,
      proficiencyNames: ["Simple Weapons"],
    });

    expect(math).toMatchObject({
      ability: "strength",
      proficient: false,
      toHit: 1,
      damage: "1d12+1",
    });
  });

  it("adds a magic bonus to both to hit and damage", () => {
    const math = getWeaponAttackMath({
      weapon: greataxe,
      scores,
      proficiencyNames: ["Martial Weapons"],
      magicBonus: 1,
    });

    expect(math.toHit).toBe(4);
    expect(math.damage).toBe("1d12+2");
  });
});

describe("describeToHitMath", () => {
  const greatsword = {
    name: "Greatsword",
    weapon_category: "Martial",
    weapon_range: "Melee",
    damage: { damage_dice: "2d6" },
    properties: [],
  };
  const scores = { strength: 15, dexterity: 10 };

  it("explains each part in plain words, pointing at the sheet", () => {
    const text = describeToHitMath(
      getWeaponAttackMath({
        weapon: greatsword,
        scores,
        proficiencyNames: ["Martial Weapons"],
        proficiencyBonus: 4,
        magicBonus: 1,
      }),
    );

    expect(text.split("\n")).toEqual([
      "When you attack, roll a d20 and add 7.",
      "• +2 from your Strength (the +2 under STR 15 on your sheet). Greatsword uses Strength.",
      "• +4 proficiency bonus, because you're trained with this weapon.",
      "• +1 because it's magic.",
      "If the total beats the target's Armor Class (AC), you hit. Change the number if your DM says otherwise.",
    ]);
  });

  it("says when the proficiency list doesn't include the weapon", () => {
    const text = describeToHitMath(
      getWeaponAttackMath({
        weapon: greatsword,
        scores,
        proficiencyNames: ["Simple Weapons"],
      }),
    );

    expect(text).toContain("roll a d20 and add 2.");
    expect(text).toContain(
      "No proficiency bonus: your Proficiencies (Features tab) don't include this weapon.",
    );
  });

  it("tells sheets with no proficiencies listed how to get the bonus counted", () => {
    const text = describeToHitMath(
      getWeaponAttackMath({
        weapon: greatsword,
        scores,
        proficiencyNames: [],
        proficiencyBonus: 4,
      }),
    );

    expect(text).toContain(
      'Not counted yet: your +4 proficiency bonus. If your class is trained with this weapon, make it +6. Add "Martial Weapons" to Proficiencies on the Features tab and the sheet will count it for you.',
    );
  });

  it("says subtract for a negative total and explains finesse", () => {
    const text = describeToHitMath(
      getWeaponAttackMath({
        weapon: {
          name: "Dagger",
          weapon_category: "Simple",
          weapon_range: "Melee",
          damage: { damage_dice: "1d4" },
          properties: [{ index: "finesse" }],
        },
        scores: { strength: 6, dexterity: 8 },
        proficiencyNames: ["Martial Weapons"],
      }),
    );

    expect(text).toContain("roll a d20 and subtract 1.");
    expect(text).toContain(
      "Dagger can use Strength or Dexterity, so it uses your better one.",
    );
  });
});

describe("describeToHitBasics", () => {
  it("explains to hit with the character's own numbers", () => {
    expect(
      describeToHitBasics({
        scores: { strength: 10, dexterity: 16 },
        proficiencyBonus: 2,
      }).split("\n"),
    ).toEqual([
      "To Hit is what you add to a d20 when you attack. If the total beats the target's Armor Class (AC), you hit.",
      "• Melee weapons add your Strength (+0). Ranged weapons add your Dexterity (+3). Finesse weapons can use either.",
      "• Add your proficiency bonus (+2) if you're trained with the weapon.",
      "Pick a weapon from the list and the sheet works this out for you.",
    ]);
  });
});

describe("splitMagicWeaponName", () => {
  it("reads a bonus before or after the name", () => {
    expect(splitMagicWeaponName("+1 Longsword")).toEqual({
      baseName: "Longsword",
      magicBonus: 1,
    });
    expect(splitMagicWeaponName("Longsword +2")).toEqual({
      baseName: "Longsword",
      magicBonus: 2,
    });
  });

  it("leaves ordinary names alone", () => {
    expect(splitMagicWeaponName(" Dagger ")).toEqual({
      baseName: "Dagger",
      magicBonus: 0,
    });
  });
});

describe("ability scores stop at 20", () => {
  it("never raises a score past 20", () => {
    expect(
      applyAbilityScoreChoice(
        { strength: 19 },
        { type: "asi-one", ability: "strength" },
      ),
    ).toEqual({ strength: 20 });
    expect(
      applyAbilityScoreChoice(
        { strength: 20, dexterity: 14 },
        { type: "asi-two", abilities: ["strength", "dexterity"] },
      ),
    ).toEqual({ strength: 20, dexterity: 15 });
  });

  it("says when an increase would pass 20", () => {
    expect(canIncreaseAbility(18, 2)).toBe(true);
    expect(canIncreaseAbility(19, 2)).toBe(false);
    expect(canIncreaseAbility(19, 1)).toBe(true);
    expect(canIncreaseAbility(20, 1)).toBe(false);
  });
});

describe("describeSpellLock", () => {
  it("says Locked for a spell the player locked, and nothing when unlocked", () => {
    expect(describeSpellLock({ locked: true })).toBe("Locked");
    expect(describeSpellLock({ locked: false, grantedBy: "your race" })).toBe(
      "",
    );
    expect(describeSpellLock({})).toBe("");
  });
});

describe("Hit Dice and rests", () => {
  function restingSheet(overrides = {}) {
    return {
      abilityScores: { constitution: 14 }, // +2
      resources: [
        { id: "r1", name: "Second Wind", max: 1, current: 0, resetOn: "short" },
        { id: "r2", name: "Rage", max: 3, current: 0, resetOn: "long" },
      ],
      combat: {
        hitPoints: { max: 30, current: 10, temporary: 0 },
        hitDice: { total: 4, remaining: 3, die: 8 },
      },
      ...overrides,
    };
  }

  it("treats a missing remaining count as all Hit Dice, and caps it at the total", () => {
    expect(getHitDiceRemaining({ total: 3 })).toBe(3);
    expect(getHitDiceRemaining({ total: 3, remaining: 5 })).toBe(3);
    expect(getHitDiceRemaining({ total: 3, remaining: 0 })).toBe(0);
  });

  it("heals each spent die + CON and counts the dice down", () => {
    const { sheet, summary } = takeShortRest(restingSheet(), [5, 3]);

    expect(sheet.combat.hitPoints.current).toBe(10 + 7 + 5);
    expect(sheet.combat.hitDice.remaining).toBe(1);
    expect(summary).toMatchObject({
      rolls: [5, 3],
      con: 2,
      healed: 12,
      hpBefore: 10,
      hpAfter: 22,
      hitDiceLeft: 1,
    });
  });

  it("refills short-rest resources but not long-rest ones", () => {
    const { sheet } = takeShortRest(restingSheet(), []);

    expect(sheet.resources.find((r) => r.id === "r1").current).toBe(1);
    expect(sheet.resources.find((r) => r.id === "r2").current).toBe(0);
  });

  it("never heals past max HP or spends more dice than are left", () => {
    const { sheet, summary } = takeShortRest(restingSheet(), [8, 8, 8, 8, 8]);

    expect(sheet.combat.hitPoints.current).toBe(30);
    expect(summary.rolls).toHaveLength(3);
    expect(summary.healed).toBe(20);
    expect(sheet.combat.hitDice.remaining).toBe(0);
  });

  it("never loses HP on a low roll with a negative CON", () => {
    const sheet = restingSheet({ abilityScores: { constitution: 6 } }); // -2
    expect(takeShortRest(sheet, [1]).summary.healed).toBe(0);
  });

  it("gives back half the Hit Dice on a long rest, at least one, never more than the total", () => {
    expect(getLongRestHitDice({ total: 5 })).toBe(2);
    expect(getLongRestHitDice({ total: 1 })).toBe(1);

    const spent = restingSheet();
    spent.combat.hitDice = { total: 4, remaining: 0, die: 8 };
    expect(applyRest(spent, "long").combat.hitDice.remaining).toBe(2);

    const nearlyFull = restingSheet();
    nearlyFull.combat.hitDice = { total: 4, remaining: 3, die: 8 };
    expect(applyRest(nearlyFull, "long").combat.hitDice.remaining).toBe(4);
  });
});

describe("choosing where racial bonuses go", () => {
  const hillDwarf = { abilityScoreIncreases: { constitution: 2, wisdom: 1 } };
  const halfElf = {
    abilityScoreIncreases: { charisma: 2 },
    abilityScoreChoice: {
      choose: 2,
      options: [
        { ability: "strength", bonus: 1 },
        { ability: "dexterity", bonus: 1 },
      ],
    },
  };
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

  it("lists each race's bonus amounts, largest first", () => {
    expect(getRaceBonusPattern(hillDwarf)).toEqual([2, 1]);
    expect(getRaceBonusPattern(halfElf)).toEqual([2, 1, 1]);
    expect(getRaceBonusPattern(human)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("offers the choice to every race except one that already raises all six", () => {
    expect(canCustomizeRaceBonuses(hillDwarf)).toBe(true);
    expect(canCustomizeRaceBonuses(halfElf)).toBe(true);
    expect(canCustomizeRaceBonuses(human)).toBe(false);
    expect(canCustomizeRaceBonuses(null)).toBe(false);
  });

  it("needs a different ability for every bonus", () => {
    expect(isCustomRaceBonusComplete([2, 1], ["dexterity", "wisdom"])).toBe(
      true,
    );
    expect(isCustomRaceBonusComplete([2, 1], ["dexterity", null])).toBe(false);
    expect(isCustomRaceBonusComplete([2, 1], ["dexterity", "dexterity"])).toBe(
      false,
    );
  });

  it("adds each amount to the picked ability", () => {
    expect(
      applyCustomRaceBonuses(
        { dexterity: 15, wisdom: 12, constitution: 14 },
        [2, 1],
        ["dexterity", "wisdom"],
      ),
    ).toEqual({ dexterity: 17, wisdom: 13, constitution: 14 });
  });
});

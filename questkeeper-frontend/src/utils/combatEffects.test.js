import { describe, it, expect, vi } from "vitest";
import {
  EFFECT_TEMPLATES,
  addFlatDamage,
  canUseSharpshooter,
  getAttackBreakdown,
  getOnHitFeatures,
  onHitEligibility,
  onHitPart,
  recordOnHit,
  turnKeyFor,
  castEffect,
  describeDamageParts,
  effectTemplateForSpell,
  endEffect,
  endEffectsForRest,
  getActiveEffects,
  getEffectiveAttack,
  getEligibleWeapons,
  isEffectActive,
  previewEffect,
  withEffectsEnded,
} from "./combatEffects";
import {
  applyRest,
  applySummonAction,
  attackWeaponFor,
  cleanExtraDamage,
  equipWeapon,
  fillPendingAttacks,
  getOutOfDateNumbers,
  isAttackPutAway,
  isWeaponItem,
  linkedItemFor,
  removeEquipmentKeepingAttacks,
  shareAttackFacts,
  syncLinkedAttacks,
  unequipWeapon,
  unlinkAttack,
  hasFeat,
  magicChoiceFor,
  magicChoiceToFields,
  refreshWeaponAttacks,
} from "./characterSheet";
import { rollDamageParts } from "./attacks";
import { toPartyRow } from "./partyStrip";

// A level 11 Ranger like Pippa (made up here; her real sheet is never used).
const deceiver = { index: "a1", name: "The Darling Deceiver", baseWeapon: "Dagger", toHit: 9, damage: "1d4+5", damageType: "Piercing" };
function ranger(extra = {}) {
  return {
    name: "QA Ranger",
    level: 11,
    abilityScores: { strength: 10, dexterity: 20, constitution: 14, intelligence: 10, wisdom: 16, charisma: 10 },
    attacks: [
      deceiver,
      { index: "a2", name: "Wisteria's Kiss", baseWeapon: "Longbow", toHit: 11, damage: "1d8+5", damageType: "Piercing" },
      { index: "a3", name: "+1 Shortsword", toHit: 10, damage: "1d6+6", damageType: "Piercing" },
      { index: "a4", name: "Unarmed Strike", toHit: 4, damage: "1", damageType: "Bludgeoning" },
    ],
    spellcasting: {
      type: "known",
      cantripsKnown: [],
      spellsKnown: [{ index: "ew", name: "Elemental Weapon", level: 3 }],
      spellSlots: [
        { level: 1, max: 4, current: 4 },
        { level: 2, max: 3, current: 3 },
        { level: 3, max: 3, current: 3 },
        { level: 4, max: 0, current: 0 },
        { level: 5, max: 1, current: 1 },
      ],
    },
    resources: [],
    features: [],
    concentration: null,
    combat: { hitPoints: { current: 90, max: 90, temporary: 0 }, hitDice: { total: 11, remaining: 11, die: 10 } },
    ...extra,
  };
}
const fire = { attackIndex: "a1", damageType: "Fire", slotLevel: 3 };
const cast = (sheet = ranger(), choices = fire) => castEffect(sheet, "elementalWeapon", choices);
const slotsLeft = (sheet, level) => sheet.spellcasting.spellSlots.find((slot) => slot.level === level).current;

describe("Elemental Weapon's numbers", () => {
  it("gives +1 to hit and 1d4 at 3rd-4th level, +2 and 2d4 at 5th-6th, +3 and 3d4 at 7th-9th, and never a damage bonus", () => {
    const rows = [3, 4, 5, 6, 7, 8, 9].map((level) =>
      EFFECT_TEMPLATES.elementalWeapon.modifiers(level, { damageType: "Fire" }).map((modifier) => modifier.value ?? modifier.dice),
    );
    expect(rows).toEqual([
      [1, "1d4"],
      [1, "1d4"],
      [2, "2d4"],
      [2, "2d4"],
      [3, "3d4"],
      [3, "3d4"],
      [3, "3d4"],
    ]);
    const kinds = EFFECT_TEMPLATES.elementalWeapon.modifiers(9, {}).map((modifier) => modifier.kind);
    expect(kinds).not.toContain("damageBonus");
  });

  it("is found by the spell's name on the sheet", () => {
    expect(effectTemplateForSpell(" elemental weapon ")?.key).toBe("elementalWeapon");
    expect(effectTemplateForSpell("Magic Weapon")).toBeNull();
  });
});

describe("casting Elemental Weapon", () => {
  it("makes the Darling Deceiver +10 with 1d4+5 piercing plus a separate 1d4 fire", () => {
    const { sheet } = cast();
    const live = getEffectiveAttack(sheet, sheet.attacks[0]);
    expect(live.toHit).toBe(10);
    expect(live.baseToHit).toBe(9);
    expect(live.damageParts).toEqual([
      { dice: "1d4+5", type: "piercing", source: "The Darling Deceiver" },
      { dice: "1d4", type: "fire", source: "Elemental Weapon" },
    ]);
    expect(describeDamageParts(live.damageParts)).toBe("1d4+5 piercing + 1d4 fire");
    expect(live.modifiers).toEqual([
      { source: "Elemental Weapon", text: "+1 to hit" },
      { source: "Elemental Weapon", text: "+1d4 fire damage" },
    ]);
    expect(live.isEnchanted).toBe(true);
  });

  it("never changes the weapon's saved numbers", () => {
    const before = ranger();
    const { sheet } = cast(before);
    expect(sheet.attacks).toBe(before.attacks);
    expect(sheet.attacks[0]).toEqual(deceiver);
    // Other weapons are untouched too.
    expect(getEffectiveAttack(sheet, sheet.attacks[1]).toHit).toBe(11);
  });

  it("spends the chosen slot and starts concentration tied to this cast", () => {
    const { sheet, effect } = cast();
    expect(slotsLeft(sheet, 3)).toBe(2);
    expect(sheet.concentration).toEqual({ spell: "Elemental Weapon", effectId: effect.id });
    expect(effect).toMatchObject({
      key: "elementalWeapon",
      spell: "Elemental Weapon",
      slotLevel: 3,
      attackIndex: "a1",
      attackName: "The Darling Deceiver",
      damageType: "Fire",
      concentration: true,
    });
  });

  it("scales with a higher slot", () => {
    const { sheet } = cast(ranger(), { ...fire, slotLevel: 5, damageType: "Thunder" });
    expect(slotsLeft(sheet, 5)).toBe(0);
    expect(slotsLeft(sheet, 3)).toBe(3);
    const live = getEffectiveAttack(sheet, sheet.attacks[0]);
    expect(live.toHit).toBe(11);
    expect(describeDamageParts(live.damageParts)).toBe("1d4+5 piercing + 2d4 thunder");
  });

  it("refuses without changing anything: no slot left, too low a slot, a wrong type, a magic weapon", () => {
    const empty = ranger();
    empty.spellcasting.spellSlots[2] = { level: 3, max: 3, current: 0 };
    expect(cast(empty)).toEqual({ error: "No level 3 spell slots left." });
    expect(cast(ranger(), { ...fire, slotLevel: 2 }).error).toMatch(/level 3 or higher/);
    expect(cast(ranger(), { ...fire, damageType: "Radiant" }).error).toMatch(/Choose a damage type/);
    expect(cast(ranger(), { ...fire, attackIndex: "a3" }).error).toMatch(/nonmagical weapon/);
    expect(cast(ranger(), { ...fire, attackIndex: "nope" }).error).toMatch(/nonmagical weapon/);
  });

  it("only offers nonmagical weapons (not +1 ones or unarmed strikes)", () => {
    const names = getEligibleWeapons(ranger(), EFFECT_TEMPLATES.elementalWeapon).map((attack) => attack.name);
    expect(names).toEqual(["The Darling Deceiver", "Wisteria's Kiss"]);
  });

  it("previews a weapon's numbers before anything is spent", () => {
    const sheet = ranger();
    const preview = previewEffect(sheet, "elementalWeapon", { ...fire, slotLevel: 5 });
    expect(preview.toHit).toBe(11);
    expect(describeDamageParts(preview.damageParts)).toBe("1d4+5 piercing + 2d4 fire");
    expect(slotsLeft(sheet, 5)).toBe(1);
  });
});

describe("Elemental Weapon ending", () => {
  it("ends when concentration is dropped, broken or replaced, and the weapon is +9 again", () => {
    const { sheet } = cast();
    for (const concentration of [null, { spell: "Hunter's Mark" }, { spell: "Elemental Weapon" }]) {
      const after = { ...sheet, concentration };
      expect(getActiveEffects(after)).toEqual([]);
      expect(getEffectiveAttack(after, after.attacks[0]).toHit).toBe(9);
      expect(withEffectsEnded(after).activeEffects).toEqual([]);
    }
  });

  it("ends when Summon Fey is cast with concentration", () => {
    const { sheet } = cast(
      ranger({
        companionMode: "creature",
        companionCreature: { name: "Fable", attacks: [], hitPoints: { current: 30, max: 30 } },
      }),
    );
    const linked = applySummonAction(sheet, "link", { template: "summonFey" });
    const summoned = applySummonAction(linked, "cast", { payWith: "slot", slotLevel: 3 });
    expect(summoned.concentration).toEqual({ spell: "Summon Fey" });
    expect(getActiveEffects(summoned)).toEqual([]);
  });

  it("keeps going when a concentration timer is set, since the effect's id is kept", () => {
    const { sheet } = cast();
    const timed = { ...sheet, concentration: { ...sheet.concentration, rounds: 600 } };
    expect(getActiveEffects(timed)).toHaveLength(1);
  });

  it("ends with its End button, which also ends the concentration held for it", () => {
    const { sheet, effect } = cast();
    const ended = endEffect(sheet, effect.id);
    expect(ended.activeEffects).toEqual([]);
    expect(ended.concentration).toBeNull();
    // Concentration on something else is left alone.
    const other = { ...sheet, concentration: { spell: "Bless" } };
    expect(endEffect(other, effect.id).concentration).toEqual({ spell: "Bless" });
  });

  it("ends with a short or a long rest, and the rest refills the slot", () => {
    for (const restType of ["short", "long"]) {
      const { sheet } = cast();
      const { sheet: rested, ended } = endEffectsForRest(applyRest(sheet, restType), restType);
      expect(ended).toEqual(["Elemental Weapon"]);
      expect(rested.activeEffects).toEqual([]);
      expect(rested.concentration).toBeNull();
    }
    expect(endEffectsForRest(ranger(), "long").ended).toEqual([]);
  });

  it("never comes back: casting it again later is a new effect", () => {
    const first = cast();
    const dropped = withEffectsEnded({ ...first.sheet, concentration: null });
    const second = cast(dropped, { ...fire, damageType: "Cold" });
    const live = getEffectiveAttack(second.sheet, second.sheet.attacks[0]);
    expect(live.effects.map((effect) => effect.id)).toEqual([second.effect.id]);
    expect(describeDamageParts(live.damageParts)).toBe("1d4+5 piercing + 1d4 cold");
  });

  it("can be recast on the same weapon (the old one ends), but never stacks", () => {
    const first = cast();
    const second = cast(first.sheet, { ...fire, damageType: "Lightning" });
    expect(second.error).toBeUndefined();
    expect(second.sheet.activeEffects.map((effect) => effect.damageType)).toEqual(["Lightning"]);
    expect(getEffectiveAttack(second.sheet, second.sheet.attacks[0]).toHit).toBe(10);
  });

  it("ends if its weapon is removed from the sheet", () => {
    const { sheet, effect } = cast();
    const without = { ...sheet, attacks: sheet.attacks.slice(1) };
    expect(isEffectActive(without, effect)).toBe(false);
  });
});

describe("Elemental Weapon and the rest of the sheet", () => {
  it("leaves older sheets and attacks with no effects exactly as they were", () => {
    const old = ranger();
    delete old.concentration;
    expect(withEffectsEnded(old)).toBe(old);
    const live = getEffectiveAttack(old, deceiver);
    expect(live.toHit).toBe(9);
    expect(live.damageParts).toEqual([{ dice: "1d4+5", type: "piercing", source: "The Darling Deceiver" }]);
    expect(live.isEnchanted).toBe(false);
  });

  it("doesn't confuse the follow-your-scores update, which sees only saved numbers", () => {
    const { sheet } = cast();
    const weaponDetailsFor = (name) =>
      name.toLowerCase() === "dagger"
        ? {
            name: "Dagger",
            weapon_category: "Simple",
            weapon_range: "Melee",
            damage: { damage_dice: "1d4", damage_type: { name: "Piercing" } },
            properties: [{ index: "finesse" }],
          }
        : null;
    const stronger = { ...sheet, proficiencies: [{ name: "Simple Weapons" }], abilityScores: { ...sheet.abilityScores, dexterity: 22 } };
    const refreshed = refreshWeaponAttacks({ ...sheet, proficiencies: [{ name: "Simple Weapons" }] }, stronger, weaponDetailsFor);
    // Saved numbers follow DEX (+9 -> +10); the effect adds on top (+11).
    expect(refreshed.attacks[0]).toMatchObject({ toHit: 10, damage: "1d4+6" });
    expect(getEffectiveAttack(refreshed, refreshed.attacks[0]).toHit).toBe(11);
  });

  it("shows on the DM's party strip, which reads full sheets", () => {
    const { sheet } = cast();
    expect(toPartyRow(sheet).effects).toEqual(["Elemental Weapon (fire) on The Darling Deceiver"]);
    expect(toPartyRow(withEffectsEnded({ ...sheet, concentration: null })).effects).toEqual([]);
  });
});

// --- Magic weapons, extra damage parts and Sharpshooter ----------------------------
//
// Wisteria's Kiss as the DM approved it: a +2 longbow that also deals 1d4
// psychic on every hit. A level 11 character with Dexterity 20 (+5),
// proficiency +4 and the Archery Fighting Style (+2).
describe("magic weapons with extra damage, and Sharpshooter", () => {
  const longbow = {
    index: "longbow",
    name: "Longbow",
    weapon_category: "Martial",
    weapon_range: "Ranged",
    damage: { damage_dice: "1d8", damage_type: { name: "Piercing" } },
    properties: [],
  };
  const dagger = {
    index: "dagger",
    name: "Dagger",
    weapon_category: "Simple",
    weapon_range: "Melee",
    damage: { damage_dice: "1d4", damage_type: { name: "Piercing" } },
    properties: [{ index: "finesse" }],
  };
  const weaponDetailsFor = (name) => ({ longbow, dagger })[String(name).toLowerCase()] ?? null;
  const plainBow = { index: "b0", name: "Longbow", toHit: 11, damage: "1d8+5", damageType: "Piercing" };
  const kissPlus2 = { index: "b2", name: "Wisteria's Kiss", baseWeapon: "Longbow", magicBonus: 2, isMagic: true, toHit: 13, damage: "1d8+7", damageType: "Piercing" };
  const kiss = { ...kissPlus2, extraDamage: [{ dice: "1d4", type: "psychic", source: "Wisteria's Kiss", condition: "" }] };
  const archer = (extra = {}) =>
    ranger({
      proficiencies: [{ name: "Martial Weapons" }],
      features: [{ name: "Fighting Style: Archery" }],
      feats: [{ name: "Sharpshooter" }],
      attacks: [plainBow, kiss, deceiver],
      ...extra,
    });

  it("works out a normal longbow as +11 and 1d8+5 piercing", () => {
    const sheet = archer();
    expect(getOutOfDateNumbers(sheet, weaponDetailsFor).attacks.map((item) => item.name)).not.toContain("Longbow");
    expect(getEffectiveAttack(sheet, plainBow).damageParts).toEqual([{ dice: "1d8+5", type: "piercing", source: "Longbow" }]);
  });

  it("counts a saved +2 in to hit and damage, so +13 and 1d8+7 aren't out of date", () => {
    const sheet = archer({ attacks: [kissPlus2] });
    expect(attackWeaponFor(kissPlus2, weaponDetailsFor).magicBonus).toBe(2);
    expect(getOutOfDateNumbers(sheet, weaponDetailsFor).attacks).toEqual([]);
    // Without the saved bonus it would have offered +11 and 1d8+5 before;
    // now it offers to mark it +2 and keep the numbers.
    const unsaved = { ...kissPlus2, magicBonus: undefined, isMagic: undefined };
    expect(getOutOfDateNumbers(archer({ attacks: [unsaved] }), weaponDetailsFor).attacks).toEqual([
      {
        index: "b2",
        name: "Wisteria's Kiss",
        saved: { toHit: 13, damage: "1d8+7" },
        worked: { toHit: 13, damage: "1d8+7", magicBonus: 2 },
        magicBonus: 2,
      },
    ]);
  });

  it("keeps a saved +2 when the scores change (a level-up)", () => {
    const before = archer({ attacks: [kissPlus2] });
    const after = refreshWeaponAttacks(before, { ...before, level: 13 }, weaponDetailsFor);
    expect(after.attacks[0]).toMatchObject({ toHit: 14, damage: "1d8+7", magicBonus: 2 });
  });

  it("rolls 1d8+7 piercing and 1d4 psychic as separate parts on every hit", () => {
    const live = getEffectiveAttack(archer(), kiss);
    expect(live.toHit).toBe(13);
    expect(live.damageParts).toEqual([
      { dice: "1d8+7", type: "piercing", source: "Wisteria's Kiss" },
      { dice: "1d4", type: "psychic", source: "Wisteria's Kiss", condition: "", key: "weapon-0" },
    ]);
    expect(describeDamageParts(live.damageParts)).toBe("1d8+7 piercing + 1d4 psychic");
    expect(live.isMagicWeapon).toBe(true);
    expect(live.isEnchanted).toBe(false);
  });

  it("only rolls extra damage with a condition when it's switched on", () => {
    const holy = { ...kiss, extraDamage: [{ dice: "2d6", type: "radiant", source: "Holy", condition: "vs undead" }] };
    expect(getEffectiveAttack(archer(), holy).damageParts).toHaveLength(1);
    expect(getEffectiveAttack(archer(), holy).optionalParts[0]).toMatchObject({ dice: "2d6", condition: "vs undead" });
    expect(getEffectiveAttack(archer(), holy, { useOptional: ["weapon-0"] }).damageParts[1]).toMatchObject({ dice: "2d6", type: "radiant" });
  });

  it("takes -5 to hit and adds +10 once with Sharpshooter, without changing the saved weapon", () => {
    const before = JSON.stringify(kiss);
    const live = getEffectiveAttack(archer(), kiss, { sharpshooter: true });
    expect(live.toHit).toBe(8);
    expect(describeDamageParts(live.damageParts)).toBe("1d8+17 piercing + 1d4 psychic");
    expect(JSON.stringify(kiss)).toBe(before);
    // Off by default.
    expect(getEffectiveAttack(archer(), kiss).toHit).toBe(13);
  });

  it("offers Sharpshooter only with the feat and only on ranged weapons", () => {
    expect(canUseSharpshooter(archer(), kiss, weaponDetailsFor)).toBe(true);
    expect(canUseSharpshooter(archer(), deceiver, weaponDetailsFor)).toBe(false);
    expect(canUseSharpshooter(archer({ feats: [] }), kiss, weaponDetailsFor)).toBe(false);
    expect(hasFeat({ features: [{ name: "Feat: Sharpshooter" }] }, "Sharpshooter")).toBe(true);
  });

  it("doubles the dice of every part on a critical hit, never the flat bonus", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d8 -> 5, d4 -> 3
    const live = getEffectiveAttack(archer(), kiss, { sharpshooter: true });
    const result = rollDamageParts(live.damageParts, { crit: true });
    // (5 x 2) + 17 piercing, then 3 x 2 psychic.
    expect(result.parts).toEqual([
      { amount: 27, type: "piercing", source: "Wisteria's Kiss" },
      { amount: 6, type: "psychic", source: "Wisteria's Kiss" },
    ]);
    expect(result.total).toBe(33);
    vi.restoreAllMocks();
  });

  it("adds Elemental Weapon to a nonmagical bow, and never to a magic one", () => {
    const sheet = archer();
    const eligible = getEligibleWeapons(sheet, EFFECT_TEMPLATES.elementalWeapon).map((attack) => attack.index);
    expect(eligible).toContain("b0");
    expect(eligible).not.toContain("b2");
    const { sheet: enchanted } = castEffect(sheet, "elementalWeapon", { attackIndex: "b0", damageType: "Fire", slotLevel: 3 });
    const live = getEffectiveAttack(enchanted, plainBow, { sharpshooter: true });
    expect(live.toHit).toBe(11 + 1 - 5);
    expect(describeDamageParts(live.damageParts)).toBe("1d8+15 piercing + 1d4 fire");
  });

  it("explains +13 as Dexterity, proficiency, Archery and magic, and -5 for Sharpshooter", () => {
    const breakdown = getAttackBreakdown(archer(), kiss, weaponDetailsFor, { sharpshooter: true });
    expect(breakdown.toHit).toEqual([
      { label: "Dexterity", value: 5 },
      { label: "Proficiency", value: 4 },
      { label: "Archery Fighting Style", value: 2 },
      { label: "Magic weapon", value: 2 },
      { label: "Sharpshooter", value: -5 },
    ]);
    expect(breakdown.toHitTotal).toBe(8);
    // A number typed on top shows as its own line, so nothing is hidden.
    const typed = getAttackBreakdown(archer(), { ...kiss, toHit: 14 }, weaponDetailsFor);
    expect(typed.toHit.at(-1)).toEqual({ label: "Typed in by you", value: 1 });
  });

  it("leaves attacks saved before these fields exactly as they worked", () => {
    const old = { index: "o1", name: "+1 Longbow", toHit: 12, damage: "1d8+6", damageType: "Piercing" };
    expect(attackWeaponFor(old, weaponDetailsFor).magicBonus).toBe(1);
    expect(getEffectiveAttack(archer(), old).damageParts).toEqual([{ dice: "1d8+6", type: "piercing", source: "+1 Longbow" }]);
    expect(getOutOfDateNumbers(archer({ attacks: [old] }), weaponDetailsFor).attacks).toEqual([]);
    expect(magicChoiceFor(old)).toBe("1");
    expect(magicChoiceFor(plainBow)).toBe("");
  });

  it("turns the editor's choices into saved fields, and back", () => {
    expect(magicChoiceToFields("2")).toEqual({ magicBonus: 2, isMagic: true });
    expect(magicChoiceToFields("0")).toEqual({ magicBonus: 0, isMagic: true });
    expect(magicChoiceToFields("")).toEqual({ magicBonus: 0, isMagic: false });
    expect(magicChoiceFor(kissPlus2)).toBe("2");
    expect(cleanExtraDamage([{ dice: " 1d4 ", type: "Psychic", source: "", condition: "" }, { dice: "" }])).toEqual([
      { dice: "1d4", type: "psychic", source: "", condition: "" },
    ]);
    expect(addFlatDamage("1d8+7", 10)).toBe("1d8+17");
    expect(addFlatDamage("2d6", 10)).toBe("2d6+10");
  });
});

// --- Inventory weapons linked to attacks ------------------------------------------
describe("inventory weapons linked to attacks", () => {
  const longbow = {
    index: "longbow",
    name: "Longbow",
    weapon_category: "Martial",
    weapon_range: "Ranged",
    damage: { damage_dice: "1d8", damage_type: { name: "Piercing" } },
    properties: [],
  };
  const weaponDetailsFor = (name) => (String(name).toLowerCase() === "longbow" ? longbow : null);
  const bowItem = {
    index: "i1",
    name: "Wisteria's Kiss",
    quantity: 1,
    baseWeapon: "Longbow",
    magicBonus: 2,
    isMagic: true,
    extraDamage: [{ dice: "1d4", type: "psychic", source: "", condition: "" }],
  };
  const archer = (extra = {}) =>
    ranger({
      proficiencies: [{ name: "Martial Weapons" }],
      features: [{ name: "Fighting Style: Archery" }],
      feats: [{ name: "Sharpshooter" }],
      equipment: [bowItem],
      attacks: [],
      ...extra,
    });

  it("makes a linked attack with the +2 and the psychic damage when a weapon is equipped", () => {
    const { sheet, needsChoice } = equipWeapon(archer(), "i1", weaponDetailsFor);
    expect(needsChoice).toBeUndefined();
    expect(sheet.equipment[0].wielded).toBe(true);
    expect(sheet.attacks).toHaveLength(1);
    const attack = sheet.attacks[0];
    expect(attack).toMatchObject({ name: "Wisteria's Kiss", inventoryIndex: "i1", toHit: 13, damage: "1d8+7", magicBonus: 2 });
    expect(describeDamageParts(getEffectiveAttack(sheet, attack).damageParts)).toBe("1d8+7 piercing + 1d4 psychic");
    expect(getEffectiveAttack(sheet, attack, { sharpshooter: true }).toHit).toBe(8);
  });

  it("asks before using a standalone attack that matches, and links it keeping its numbers", () => {
    const own = { index: "a9", name: "Wisteria's Kiss", baseWeapon: "Longbow", toHit: 14, damage: "1d8+8", damageType: "Piercing" };
    const start = archer({ attacks: [own], equipment: [{ index: "i1", name: "Wisteria's Kiss", quantity: 1 }] });
    const asked = equipWeapon(start, "i1", weaponDetailsFor);
    expect(asked.needsChoice.map((attack) => attack.index)).toEqual(["a9"]);
    expect(asked.sheet).toBe(start);
    const { sheet } = equipWeapon(start, "i1", weaponDetailsFor, "link:a9");
    expect(sheet.attacks).toHaveLength(1);
    expect(sheet.attacks[0]).toMatchObject({ toHit: 14, damage: "1d8+8", inventoryIndex: "i1" });
    // The attack teaches the item its weapon type.
    expect(sheet.equipment[0].baseWeapon).toBe("Longbow");
    // "Just equip" and "new attack" are the other answers.
    expect(equipWeapon(start, "i1", weaponDetailsFor, "none").sheet.attacks).toHaveLength(1);
    expect(equipWeapon(start, "i1", weaponDetailsFor, "new").sheet.attacks).toHaveLength(2);
  });

  it("hides linked attacks when unequipped, keeps their setup, and brings them back", () => {
    const { sheet } = equipWeapon(archer(), "i1", weaponDetailsFor);
    const away = unequipWeapon(sheet, "i1");
    expect(away.attacks).toHaveLength(1);
    expect(isAttackPutAway(away, away.attacks[0])).toBe(true);
    const back = equipWeapon(away, "i1", weaponDetailsFor).sheet;
    expect(back.attacks).toHaveLength(1);
    expect(isAttackPutAway(back, back.attacks[0])).toBe(false);
  });

  it("updates every linked attack when the weapon is edited, without duplicates", () => {
    let { sheet } = equipWeapon(archer(), "i1", weaponDetailsFor);
    sheet = { ...sheet, attacks: [...sheet.attacks, { ...sheet.attacks[0], index: "a2", name: "Kiss (called shot)" }] };
    const before = sheet.equipment[0];
    const edited = { ...sheet, equipment: [{ ...before, name: "Wisteria's Kiss +3", magicBonus: 3 }] };
    const synced = syncLinkedAttacks(edited, "i1", before, weaponDetailsFor);
    expect(synced.attacks).toHaveLength(2);
    expect(synced.attacks[0]).toMatchObject({ name: "Wisteria's Kiss +3", toHit: 14, damage: "1d8+8", magicBonus: 3 });
    // Its own name is kept.
    expect(synced.attacks[1]).toMatchObject({ name: "Kiss (called shot)", toHit: 14, magicBonus: 3 });
  });

  it("never overwrites numbers the player customised", () => {
    let { sheet } = equipWeapon(archer(), "i1", weaponDetailsFor);
    sheet = { ...sheet, attacks: [{ ...sheet.attacks[0], toHit: 15 }, { ...sheet.attacks[0], index: "a2", manual: true }] };
    const before = sheet.equipment[0];
    const synced = syncLinkedAttacks({ ...sheet, equipment: [{ ...before, magicBonus: 3 }] }, "i1", before, weaponDetailsFor);
    expect(synced.attacks[0]).toMatchObject({ toHit: 15, damage: "1d8+7", magicBonus: 3 });
    expect(synced.attacks[1]).toMatchObject({ toHit: 13, damage: "1d8+7", magicBonus: 3 });
  });

  it("shares facts edited on a linked attack with its item and the other attacks", () => {
    let { sheet } = equipWeapon(archer(), "i1", weaponDetailsFor);
    sheet = { ...sheet, attacks: [...sheet.attacks, { ...sheet.attacks[0], index: "a2" }] };
    const first = sheet.attacks[0].index;
    const holy = [{ dice: "1d4", type: "psychic", source: "", condition: "" }, { dice: "2d6", type: "radiant", source: "", condition: "vs undead" }];
    sheet = { ...sheet, attacks: sheet.attacks.map((attack) => (attack.index === first ? { ...attack, extraDamage: holy } : attack)) };
    const shared = shareAttackFacts(sheet, first, weaponDetailsFor);
    expect(shared.equipment[0].extraDamage).toHaveLength(2);
    expect(shared.attacks[1].extraDamage).toHaveLength(2);
  });

  it("unlinks instead of deleting attacks when the item is removed", () => {
    const { sheet } = equipWeapon(archer(), "i1", weaponDetailsFor);
    const removed = removeEquipmentKeepingAttacks(sheet, "i1");
    expect(removed.equipment).toEqual([]);
    expect(removed.attacks).toHaveLength(1);
    expect(removed.attacks[0].inventoryIndex).toBeUndefined();
    expect(removed.attacks[0]).toMatchObject({ toHit: 13, magicBonus: 2 });
    expect(isAttackPutAway(removed, removed.attacks[0])).toBe(false);
  });

  it("keeps Elemental Weapon and concentration working on a linked nonmagical bow", () => {
    const plain = { index: "i2", name: "Longbow", quantity: 1 };
    const { sheet } = equipWeapon(archer({ equipment: [plain] }), "i2", weaponDetailsFor);
    const attack = sheet.attacks[0];
    const { sheet: enchanted } = castEffect(sheet, "elementalWeapon", { attackIndex: attack.index, damageType: "Cold", slotLevel: 3 });
    expect(enchanted.concentration.spell).toBe("Elemental Weapon");
    expect(describeDamageParts(getEffectiveAttack(enchanted, attack).damageParts)).toBe("1d8+5 piercing + 1d4 cold");
  });

  it("leaves standalone attacks and older sheets alone", () => {
    const old = ranger();
    expect(old.attacks.every((attack) => !isAttackPutAway(old, attack))).toBe(true);
    expect(isWeaponItem({ name: "Longbow" })).toBe(true);
    expect(isWeaponItem({ name: "Rope" })).toBe(false);
    expect(linkedItemFor(old, old.attacks[0])).toBeNull();
    expect(unlinkAttack(old, "a1").attacks[0]).toEqual(deceiver);
  });
});

describe("linking keeps a magic bonus the attack already had", () => {
  it("teaches an item with empty weapon fields the attack's +2", () => {
    const longbow = { index: "longbow", name: "Longbow", weapon_category: "Martial", weapon_range: "Ranged", damage: { damage_dice: "1d8", damage_type: { name: "Piercing" } }, properties: [] };
    const weaponDetailsFor = (name) => (String(name).toLowerCase() === "longbow" ? longbow : null);
    const item = { index: "i1", name: "Wisteria's Kiss", quantity: 1, magicBonus: 0, isMagic: false, extraDamage: [] };
    const attack = { index: "a1", name: "Wisteria's Kiss", baseWeapon: "Longbow", toHit: 13, damage: "1d8+7", damageType: "Piercing" };
    const sheet = ranger({ proficiencies: [{ name: "Martial Weapons" }], features: [{ name: "Fighting Style: Archery" }], equipment: [item], attacks: [attack] });
    // An old attack with the +2 typed in: linking it notices the bonus via the out-of-date check first.
    const marked = { ...sheet, attacks: [{ ...attack, magicBonus: 2, isMagic: true }] };
    const linked = equipWeapon(marked, "i1", weaponDetailsFor, "link:a1").sheet;
    expect(linked.equipment[0]).toMatchObject({ magicBonus: 2, isMagic: true, baseWeapon: "Longbow" });
    expect(linked.attacks[0]).toMatchObject({ magicBonus: 2, toHit: 13, damage: "1d8+7" });
    expect(getOutOfDateNumbers(linked, weaponDetailsFor).attacks).toEqual([]);
    // Without the bonus saved anywhere, the notice offers to mark it +2.
    const plain = equipWeapon(sheet, "i1", weaponDetailsFor, "link:a1").sheet;
    expect(plain.attacks[0]).toMatchObject({ toHit: 13, damage: "1d8+7", inventoryIndex: "i1" });
    expect(getOutOfDateNumbers(plain, weaponDetailsFor).attacks[0]).toMatchObject({ magicBonus: 2 });
  });
});

// --- Phase 3b regressions: linked weapons stay in step -----------------------------
describe("linked weapons stay in step (regressions)", () => {
  const weapon = (name, dice, range = "Ranged") => ({
    index: name.toLowerCase(),
    name,
    weapon_category: "Martial",
    weapon_range: range,
    damage: { damage_dice: dice, damage_type: { name: "Piercing" } },
    properties: [],
  });
  const known = { longbow: weapon("Longbow", "1d8"), shortbow: weapon("Shortbow", "1d6") };
  // Loaded: SRD details, or null for a weapon that isn't in the SRD.
  const loaded = (name) => known[String(name).toLowerCase()] ?? null;
  // Nothing has loaded yet.
  const loading = () => undefined;
  const kissItem = { index: "i1", name: "Wisteria's Kiss", quantity: 1, baseWeapon: "Longbow", magicBonus: 2, isMagic: true, extraDamage: [] };
  const archer = (extra = {}) =>
    ranger({
      proficiencies: [{ name: "Martial Weapons" }],
      features: [{ name: "Fighting Style: Archery" }],
      equipment: [kissItem],
      attacks: [],
      ...extra,
    });
  const equipped = (sheet = archer()) => equipWeapon(sheet, "i1", loaded).sheet;
  const editItem = (sheet, changes) => {
    const before = sheet.equipment[0];
    return syncLinkedAttacks({ ...sheet, equipment: [{ ...before, ...changes }] }, "i1", before, loaded);
  };

  it("fills in a renamed weapon added and equipped before its details loaded, with no repair needed", () => {
    const waiting = equipWeapon(archer(), "i1", loading).sheet;
    expect(waiting.attacks[0]).toMatchObject({ numbersPending: true, inventoryIndex: "i1" });
    // Not offered as out of date while it waits.
    expect(getOutOfDateNumbers(waiting, loaded).attacks).toEqual([]);
    const filled = fillPendingAttacks(waiting, loaded);
    expect(filled.attacks[0]).toMatchObject({ toHit: 13, damage: "1d8+7", damageType: "Piercing" });
    expect(filled.attacks[0].numbersPending).toBeUndefined();
    expect(getOutOfDateNumbers(filled, loaded).attacks).toEqual([]);
    // Running it again changes nothing (safe to run on every load).
    expect(fillPendingAttacks(filled, loaded)).toBe(filled);
    // Still loading: waits.
    expect(fillPendingAttacks(waiting, loading)).toBe(waiting);
  });

  it("drops the wait for a homebrew weapon, leaving its numbers to the player", () => {
    const homebrew = { index: "i9", name: "Star Sling", quantity: 1, category: "weapons" };
    const waiting = equipWeapon(archer({ equipment: [homebrew] }), "i9", loading).sheet;
    const done = fillPendingAttacks(waiting, loaded);
    expect(done.attacks[0].numbersPending).toBeUndefined();
    expect(done.attacks[0]).toMatchObject({ toHit: 0, damage: "" });
  });

  it("waits for a new weapon type's details when the linked item's type changes", () => {
    const sheet = equipped();
    const before = sheet.equipment[0];
    const changed = { ...sheet, equipment: [{ ...before, baseWeapon: "Shortbow" }] };
    const waiting = syncLinkedAttacks(changed, "i1", before, (name) => (String(name).toLowerCase() === "shortbow" ? undefined : loaded(name)));
    expect(waiting.attacks[0]).toMatchObject({ numbersPending: true, baseWeapon: "Shortbow" });
    expect(fillPendingAttacks(waiting, loaded).attacks[0]).toMatchObject({ toHit: 13, damage: "1d6+7" });
  });

  it("follows a magic enhancement change on every linked attack that wasn't customised", () => {
    let sheet = equipWeapon(equipped(), "i1", loaded, "new").sheet;
    expect(sheet.attacks).toHaveLength(2);
    sheet = editItem(sheet, { magicBonus: 3 });
    expect(sheet.attacks.map((attack) => [attack.toHit, attack.damage, attack.magicBonus])).toEqual([
      [14, "1d8+8", 3],
      [14, "1d8+8", 3],
    ]);
    // Taking the magic off goes back down.
    sheet = editItem(sheet, { magicBonus: 0, isMagic: false });
    expect(sheet.attacks[0]).toMatchObject({ toHit: 11, damage: "1d8+5", isMagic: false });
    expect(getEffectiveAttack(sheet, sheet.attacks[0]).isMagicWeapon).toBe(false);
  });

  it("follows extra typed damage being added, changed and removed", () => {
    let sheet = equipped();
    sheet = editItem(sheet, { extraDamage: [{ dice: "1d4", type: "psychic", source: "", condition: "" }] });
    expect(describeDamageParts(getEffectiveAttack(sheet, sheet.attacks[0]).damageParts)).toBe("1d8+7 piercing + 1d4 psychic");
    sheet = editItem(sheet, { extraDamage: [{ dice: "2d4", type: "psychic", source: "", condition: "" }] });
    expect(describeDamageParts(getEffectiveAttack(sheet, sheet.attacks[0]).damageParts)).toBe("1d8+7 piercing + 2d4 psychic");
    sheet = editItem(sheet, { extraDamage: [] });
    expect(describeDamageParts(getEffectiveAttack(sheet, sheet.attacks[0]).damageParts)).toBe("1d8+7 piercing");
    // The numbers never moved: extra damage is its own part.
    expect(sheet.attacks[0]).toMatchObject({ toHit: 13, damage: "1d8+7" });
  });

  it("keeps a manual override through item edits, and offers (never forces) the new numbers", () => {
    let sheet = equipped();
    sheet = { ...sheet, attacks: [{ ...sheet.attacks[0], toHit: 15, damage: "1d8+9" }] };
    sheet = editItem(sheet, { magicBonus: 3 });
    expect(sheet.attacks[0]).toMatchObject({ toHit: 15, damage: "1d8+9", magicBonus: 3 });
    expect(getOutOfDateNumbers(sheet, loaded).attacks[0]).toMatchObject({ worked: { toHit: 14, damage: "1d8+8" } });
    // "Keep mine": never offered again, never changed.
    const kept = { ...sheet, attacks: [{ ...sheet.attacks[0], manual: true }] };
    expect(getOutOfDateNumbers(kept, loaded).attacks).toEqual([]);
    expect(editItem(kept, { magicBonus: 1 }).attacks[0]).toMatchObject({ toHit: 15, damage: "1d8+9" });
  });

  it("hides every linked attack when unequipped and brings the same ones back, never adding more", () => {
    let sheet = equipWeapon(equipped(), "i1", loaded, "new").sheet;
    const indexes = sheet.attacks.map((attack) => attack.index);
    sheet = unequipWeapon(sheet, "i1");
    expect(sheet.attacks.every((attack) => isAttackPutAway(sheet, attack))).toBe(true);
    sheet = equipWeapon(sheet, "i1", loaded).sheet;
    expect(sheet.attacks.map((attack) => attack.index)).toEqual(indexes);
    expect(sheet.attacks.some((attack) => isAttackPutAway(sheet, attack))).toBe(false);
  });

  it("reads back the same after a save and refresh", () => {
    let sheet = editItem(equipped(), { extraDamage: [{ dice: "1d4", type: "psychic", source: "", condition: "" }] });
    sheet = unequipWeapon(sheet, "i1");
    const refreshed = JSON.parse(JSON.stringify(sheet));
    expect(refreshed).toEqual(JSON.parse(JSON.stringify(sheet)));
    expect(isAttackPutAway(refreshed, refreshed.attacks[0])).toBe(true);
    const back = equipWeapon(refreshed, "i1", loaded).sheet;
    expect(getEffectiveAttack(back, back.attacks[0], { sharpshooter: true })).toMatchObject({ toHit: 8 });
    expect(getOutOfDateNumbers(back, loaded).attacks).toEqual([]);
    expect(fillPendingAttacks(back, loaded)).toBe(back);
  });
});

// --- On-hit features: Dreadful Strikes -------------------------------------------
describe("Dreadful Strikes as an on-hit feature", () => {
  const feyWanderer = (level, extra = {}) =>
    ranger({ level, class: { id: "ranger", subclass: { id: "hb-fey", name: "Fey Wanderer" } }, ...extra });
  const tableOn = (round, currentId, active = true) => ({ combat_active: active, round, current_combatant_id: currentId });

  it("comes from the character's class or features, with dice by Ranger level", () => {
    expect(getOnHitFeatures(feyWanderer(2))).toEqual([]);
    expect(getOnHitFeatures(feyWanderer(3))[0]).toMatchObject({ name: "Dreadful Strikes", dice: "1d4", type: "psychic", limit: "oncePerTargetPerTurn" });
    expect(getOnHitFeatures(feyWanderer(10))[0].dice).toBe("1d4");
    expect(getOnHitFeatures(feyWanderer(11))[0].dice).toBe("1d6");
    // Listed as a feature counts too; a Ranger of another subclass doesn't get it.
    expect(getOnHitFeatures(ranger({ level: 5, features: [{ name: "Dreadful Strikes" }] }))[0].dice).toBe("1d4");
    expect(getOnHitFeatures(ranger({ level: 11, class: { id: "ranger", subclass: { name: "Hunter" } } }))).toEqual([]);
    // A homebrew subclass's own damage steps win.
    const homebrew = [{ name: "Dreadful Strikes", damage: [{ level: 3, dice: "1d8", type: "Psychic" }] }];
    expect(getOnHitFeatures(feyWanderer(5), homebrew)[0]).toMatchObject({ dice: "1d8", type: "psychic" });
  });

  it("knows the turn only while a fight is running", () => {
    expect(turnKeyFor(tableOn(2, "c-pippa"))).toBe("2:c-pippa");
    expect(turnKeyFor(tableOn(2, "c-pippa", false))).toBeNull();
    expect(turnKeyFor({ combat_active: true, round: 1, current_combatant_id: null })).toBeNull();
    expect(turnKeyFor(null)).toBeNull();
  });

  it("lands once per creature per turn, other creatures still can, and a new turn resets it", () => {
    const [dreadful] = getOnHitFeatures(feyWanderer(11));
    const turn = turnKeyFor(tableOn(1, "c-pippa"));
    let sheet = feyWanderer(11);
    expect(onHitEligibility(sheet, dreadful, { turnKey: turn, targetId: "goblin-1" }).status).toBe("ok");
    sheet = recordOnHit(sheet, dreadful, turn, "goblin-1");
    // A second hit on the same goblin this turn: not again.
    expect(onHitEligibility(sheet, dreadful, { turnKey: turn, targetId: "goblin-1" }).status).toBe("used");
    // Another goblin this turn: yes.
    expect(onHitEligibility(sheet, dreadful, { turnKey: turn, targetId: "goblin-2" }).status).toBe("ok");
    sheet = recordOnHit(sheet, dreadful, turn, "goblin-2");
    expect(sheet.onHitUses["dreadful strikes"].targets).toEqual(["goblin-1", "goblin-2"]);
    // Someone else's turn, or the next round: fresh.
    expect(onHitEligibility(sheet, dreadful, { turnKey: turnKeyFor(tableOn(1, "c-orc")), targetId: "goblin-1" }).status).toBe("ok");
    expect(onHitEligibility(sheet, dreadful, { turnKey: turnKeyFor(tableOn(2, "c-pippa")), targetId: "goblin-1" }).status).toBe("ok");
    // Recording in a new turn starts a new list.
    const next = recordOnHit(sheet, dreadful, turnKeyFor(tableOn(2, "c-pippa")), "goblin-1");
    expect(next.onHitUses["dreadful strikes"]).toEqual({ turn: "2:c-pippa", targets: ["goblin-1"] });
  });

  it("falls back to the player keeping track when the turn or target isn't known, and records nothing", () => {
    const [dreadful] = getOnHitFeatures(feyWanderer(11));
    const sheet = feyWanderer(11);
    expect(onHitEligibility(sheet, dreadful, { turnKey: null, targetId: "goblin-1" }).status).toBe("manual");
    expect(onHitEligibility(sheet, dreadful, { turnKey: "1:c-pippa", targetId: null }).status).toBe("manual");
    expect(recordOnHit(sheet, dreadful, null, "goblin-1")).toBe(sheet);
  });

  it("adds its own psychic part after the weapon's and Elemental Weapon's, all doubled on a crit, weapon untouched", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d4 -> 3, d6 -> 4
    const [dreadful] = getOnHitFeatures(feyWanderer(11));
    const { sheet } = castEffect(feyWanderer(11), "elementalWeapon", { attackIndex: "a1", damageType: "Fire", slotLevel: 3 });
    const before = JSON.stringify(deceiver);
    const parts = [...getEffectiveAttack(sheet, deceiver).damageParts, onHitPart(dreadful)];
    const result = rollDamageParts(parts, { crit: true });
    expect(result.parts).toEqual([
      { amount: 11, type: "piercing", source: "The Darling Deceiver" },
      { amount: 6, type: "fire", source: "Elemental Weapon" },
      { amount: 8, type: "psychic", source: "Dreadful Strikes" },
    ]);
    expect(JSON.stringify(deceiver)).toBe(before);
    vi.restoreAllMocks();
  });
});

describe("Sharpshooter's -5 / +10 is the 2014 feat only", () => {
  const longbow = { name: "Longbow", weapon_category: "Martial", weapon_range: "Ranged", damage: { damage_dice: "1d8" } };
  const details = (name) => (String(name).toLowerCase() === "longbow" ? longbow : null);
  const bow = { index: "b", name: "Longbow", toHit: 9, damage: "1d8+5" };
  it("offers the toggle for the 2014 feat or one with no edition saved, never 2024 or homebrew", () => {
    expect(canUseSharpshooter(ranger({ feats: [{ name: "Sharpshooter", edition: "2014" }] }), bow, details)).toBe(true);
    expect(canUseSharpshooter(ranger({ feats: [{ name: "Sharpshooter" }] }), bow, details)).toBe(true);
    expect(canUseSharpshooter(ranger({ feats: [{ name: "Sharpshooter", edition: "2024" }] }), bow, details)).toBe(false);
    expect(canUseSharpshooter(ranger({ feats: [{ name: "Sharpshooter", edition: "Homebrew" }] }), bow, details)).toBe(false);
  });
});

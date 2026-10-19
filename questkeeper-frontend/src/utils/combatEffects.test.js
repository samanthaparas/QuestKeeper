import { describe, it, expect } from "vitest";
import {
  EFFECT_TEMPLATES,
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
import { applyRest, applySummonAction, refreshWeaponAttacks } from "./characterSheet";
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

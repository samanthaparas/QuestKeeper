import { describe, it, expect } from "vitest";
import {
  BASE_WEAPON_ICON_IDS,
  EXTRA_ICON_IDS,
  FALLBACK_ICON_ID,
  resolveWeaponIcon,
  weaponIconForAttack,
  weaponIconForCompanionAttack,
} from "./weaponIcons";
import { weaponIconShapes } from "../components/WeaponIcon/weaponIconShapes";

// The weapon lists the rules server (dnd5eapi) gave for each edition on
// 2026-11-22, as [id, name]: what the app's weapon look-ups actually load.
const CATALOG_2014 = [
  ["club", "Club"], ["dagger", "Dagger"], ["greatclub", "Greatclub"], ["handaxe", "Handaxe"],
  ["javelin", "Javelin"], ["light-hammer", "Light hammer"], ["mace", "Mace"], ["quarterstaff", "Quarterstaff"],
  ["sickle", "Sickle"], ["spear", "Spear"], ["crossbow-light", "Crossbow, light"], ["dart", "Dart"],
  ["shortbow", "Shortbow"], ["sling", "Sling"], ["battleaxe", "Battleaxe"], ["flail", "Flail"],
  ["glaive", "Glaive"], ["greataxe", "Greataxe"], ["greatsword", "Greatsword"], ["halberd", "Halberd"],
  ["lance", "Lance"], ["longsword", "Longsword"], ["maul", "Maul"], ["morningstar", "Morningstar"],
  ["pike", "Pike"], ["rapier", "Rapier"], ["scimitar", "Scimitar"], ["shortsword", "Shortsword"],
  ["trident", "Trident"], ["war-pick", "War pick"], ["warhammer", "Warhammer"], ["whip", "Whip"],
  ["blowgun", "Blowgun"], ["crossbow-hand", "Crossbow, hand"], ["crossbow-heavy", "Crossbow, heavy"],
  ["longbow", "Longbow"], ["net", "Net"],
  // The 2014 list also has the SRD's magic weapons.
  ["berserker-axe", "Berserker Axe"], ["dagger-of-venom", "Dagger of Venom"], ["dancing-sword", "Dancing Sword"],
  ["defender", "Defender"], ["dragon-slayer", "Dragon Slayer"], ["dwarven-thrower", "Dwarven Thrower"],
  ["flame-tongue", "Flame Tongue"], ["frost-brand", "Frost Brand"], ["giant-slayer", "Giant Slayer"],
  ["hammer-of-thunderbolts", "Hammer of Thunderbolts"], ["holy-avenger", "Holy Avenger"],
  ["javelin-of-lightning", "Javelin of Lightning"], ["luck-blade", "Luck Blade"],
  ["mace-of-disruption", "Mace of Disruption"], ["mace-of-smiting", "Mace of Smiting"],
  ["mace-of-terror", "Mace of Terror"], ["nine-lives-stealer", "Nine Lives Stealer"], ["oathbow", "Oathbow"],
  ["scimitar-of-speed", "Scimitar of Speed"], ["sun-blade", "Sun Blade"],
  ["sword-of-life-stealing", "Sword of Life Stealing"], ["sword-of-sharpness", "Sword of Sharpness"],
  ["sword-of-wounding", "Sword of Wounding"], ["trident-of-fish-command", "Trident of Fish Command"],
  ["vicious-weapon", "Vicious Weapon"], ["vorpal-sword", "Vorpal Sword"], ["weapon", "Weapon, +1, +2, or +3"],
  ["weapon-1", "Weapon, +1"], ["weapon-2", "Weapon, +2"], ["weapon-3", "Weapon, +3"],
];

const CATALOG_2024 = [
  ["battleaxe", "Battleaxe"], ["blowgun", "Blowgun"], ["club", "Club"], ["dagger", "Dagger"], ["dart", "Dart"],
  ["flail", "Flail"], ["glaive", "Glaive"], ["greataxe", "Greataxe"], ["greatclub", "Greatclub"],
  ["greatsword", "Greatsword"], ["halberd", "Halberd"], ["hand-crossbow", "Hand Crossbow"], ["handaxe", "Handaxe"],
  ["heavy-crossbow", "Heavy Crossbow"], ["javelin", "Javelin"], ["lance", "Lance"],
  ["light-crossbow", "Light Crossbow"], ["light-hammer", "Light Hammer"], ["longbow", "Longbow"],
  ["longsword", "Longsword"], ["mace", "Mace"], ["maul", "Maul"], ["morningstar", "Morningstar"],
  ["musket", "Musket"], ["pike", "Pike"], ["pistol", "Pistol"], ["quarterstaff", "Quarterstaff"],
  ["rapier", "Rapier"], ["scimitar", "Scimitar"], ["shortbow", "Shortbow"], ["shortsword", "Shortsword"],
  ["sickle", "Sickle"], ["sling", "Sling"], ["spear", "Spear"], ["trident", "Trident"],
  ["warhammer", "Warhammer"], ["war-pick", "War Pick"], ["whip", "Whip"],
];

// 2014 magic weapons that can be any sword or any weapon: they get the
// plain picture unless the attack's weapon type says what they are.
const UNMAPPED_2014 = [
  "berserker-axe", "dancing-sword", "defender", "dragon-slayer", "flame-tongue", "frost-brand",
  "giant-slayer", "holy-avenger", "luck-blade", "nine-lives-stealer", "sun-blade",
  "sword-of-life-stealing", "sword-of-sharpness", "sword-of-wounding", "vicious-weapon", "vorpal-sword",
  "weapon", "weapon-1", "weapon-2", "weapon-3",
];

describe("weapon icons: the pack", () => {
  it("has 39 ordinary weapons and a drawing for every picture", () => {
    expect(BASE_WEAPON_ICON_IDS).toHaveLength(39);
    const all = [...BASE_WEAPON_ICON_IDS, ...EXTRA_ICON_IDS];
    expect(all).toHaveLength(51);
    expect(new Set(all).size).toBe(51);
    expect(Object.keys(weaponIconShapes).sort()).toEqual([...all].sort());
    for (const id of all) expect(resolveWeaponIcon({ iconId: id })).toBe(id);
  });

  it("the plain fallback is its own neutral drawing, not a copy of any weapon", () => {
    const fallback = JSON.stringify(weaponIconShapes[FALLBACK_ICON_ID]);
    for (const id of BASE_WEAPON_ICON_IDS) expect(JSON.stringify(weaponIconShapes[id]), id).not.toBe(fallback);
    // The old sword blade isn't in it.
    expect(fallback).not.toContain("M24 6L28 15L27 30H21L20 15Z");
  });
});

describe("weapon icons: the app's real weapon lists", () => {
  it("every 2024 weapon gets its own picture, by id and by name", () => {
    for (const [id, name] of CATALOG_2024) {
      const icon = resolveWeaponIcon({ weaponId: id });
      expect(icon, id).not.toBe(FALLBACK_ICON_ID);
      expect(resolveWeaponIcon({ name }), name).toBe(icon);
    }
  });

  it("every ordinary 2014 weapon gets its own picture; only the any-weapon magic items fall back", () => {
    const unmapped = CATALOG_2014.filter(([id]) => resolveWeaponIcon({ weaponId: id }) === FALLBACK_ICON_ID).map(
      ([id]) => id,
    );
    expect(unmapped).toEqual(UNMAPPED_2014);
    for (const [id, name] of CATALOG_2014.slice(0, 37)) {
      expect(resolveWeaponIcon({ name }), name).toBe(resolveWeaponIcon({ weaponId: id }));
    }
  });

  it("magic weapons that are always one weapon use it", () => {
    expect(resolveWeaponIcon({ name: "Dagger of Venom" })).toBe("dagger");
    expect(resolveWeaponIcon({ name: "Oathbow" })).toBe("longbow");
    expect(resolveWeaponIcon({ name: "Dwarven Thrower" })).toBe("warhammer");
  });
});

describe("weapon icons: what a weapon is, never a guess", () => {
  it("a renamed magic longbow is still a longbow", () => {
    expect(weaponIconForAttack({ name: "Wisteria's Kiss", baseWeapon: "Longbow", magicBonus: 2 })).toBe("longbow");
    expect(weaponIconForAttack({ name: "Moonpetal Bow", baseWeapon: "+2 Longbow" })).toBe("longbow");
  });

  it("reads +N names and both ways of writing crossbows", () => {
    expect(weaponIconForAttack({ name: "+1 Dagger" })).toBe("dagger");
    expect(weaponIconForAttack({ name: "Dagger +1" })).toBe("dagger");
    expect(weaponIconForAttack({ name: "Crossbow, light" })).toBe("crossbow-light");
    expect(weaponIconForAttack({ name: "Light Crossbow" })).toBe("crossbow-light");
    expect(weaponIconForAttack({ name: "Hand Crossbow" })).toBe("crossbow-hand");
    expect(weaponIconForAttack({ name: "Crossbow, heavy" })).toBe("crossbow-heavy");
  });

  it("uses the linked inventory weapon's type when the attack has none", () => {
    const item = { index: "item-7", name: "Grandmother's Bow", baseWeapon: "Shortbow" };
    expect(weaponIconForAttack({ name: "Grandmother's Bow", inventoryIndex: "item-7" }, { item })).toBe("shortbow");
  });

  it("the same homebrew weapon gets its real picture once its weapon type is saved", () => {
    expect(weaponIconForAttack({ name: "Frost Bow of Secrets" })).toBe(FALLBACK_ICON_ID);
    expect(weaponIconForAttack({ name: "Frost Bow of Secrets", baseWeapon: "Longbow" })).toBe("longbow");
  });

  it("magic items that can be any weapon use their saved weapon type, never one fixed picture", () => {
    expect(weaponIconForAttack({ name: "Flame Tongue" })).toBe(FALLBACK_ICON_ID);
    expect(weaponIconForAttack({ name: "Flame Tongue", baseWeapon: "Greatsword" })).toBe("greatsword");
    expect(weaponIconForAttack({ name: "Flame Tongue", baseWeapon: "Scimitar" })).toBe("scimitar");
    expect(weaponIconForAttack({ name: "Defender" })).toBe(FALLBACK_ICON_ID);
    expect(weaponIconForAttack({ name: "Defender", baseWeapon: "Rapier" })).toBe("rapier");
    // Or the weapon type of the inventory item it's linked to.
    const item = { index: "i1", name: "Defender", baseWeapon: "Longsword" };
    expect(weaponIconForAttack({ name: "Defender", inventoryIndex: "i1" }, { item })).toBe("longsword");
  });

  it("the attack's own weapon type wins over its name", () => {
    expect(weaponIconForAttack({ name: "Longsword", baseWeapon: "Rapier" })).toBe("rapier");
  });

  it("doesn't guess from words in a name or the notes", () => {
    for (const attack of [
      { name: "Frost Bow of Secrets" },
      { name: "Club Sandwich" },
      { name: "Sword of the Silent Moon" },
      { name: "Bowstring Snapper" },
      { name: "Moon blade", notes: "Works like a longsword" },
      { name: "" },
      {},
      { name: "Thing", baseWeapon: "Glass Cannon" },
    ]) {
      expect(weaponIconForAttack(attack), JSON.stringify(attack)).toBe(FALLBACK_ICON_ID);
    }
    expect(weaponIconForAttack(undefined)).toBe(FALLBACK_ICON_ID);
  });

  it("a spell typed in as an attack gets no weapon picture", () => {
    expect(weaponIconForAttack({ name: "Fire Bolt" }, { spellNames: ["Fire Bolt", "Shield"] })).toBeNull();
    expect(weaponIconForAttack({ name: "fire bolt" }, { spellNames: ["Fire Bolt"] })).toBeNull();
    // Not a spell on this sheet, or made with a weapon: a picture as usual.
    expect(weaponIconForAttack({ name: "Fire Bolt" })).toBe(FALLBACK_ICON_ID);
    expect(weaponIconForAttack({ name: "Shillelagh", baseWeapon: "Club" }, { spellNames: ["Shillelagh"] })).toBe("club");
  });
});

describe("weapon icons: companions", () => {
  it("natural attacks and weapons by their exact name", () => {
    expect(weaponIconForCompanionAttack({ name: "Bite" })).toBe("bite");
    expect(weaponIconForCompanionAttack({ name: "Claws" })).toBe("claw");
    expect(weaponIconForCompanionAttack({ name: "Tentacles" })).toBe("tentacle");
    // Talons use the claw picture, however they're capitalised or spaced.
    for (const name of ["Talon", "Talons", "talons", "  TALONS ", "Talon\t"]) {
      expect(weaponIconForCompanionAttack({ name }), JSON.stringify(name)).toBe("claw");
    }
    expect(weaponIconForCompanionAttack({ name: "Shortsword" })).toBe("shortsword");
  });

  it("anything else falls back safely", () => {
    for (const name of ["Savage Bite of the Pack", "Razor Talons", "Talonstrike", "Hooves", "", undefined]) {
      expect(weaponIconForCompanionAttack({ name }), String(name)).toBe(FALLBACK_ICON_ID);
    }
  });
});

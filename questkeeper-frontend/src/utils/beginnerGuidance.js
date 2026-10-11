// Plain-language "who is this for?" help for choosing a race or class, written
// for someone who has never played. `tagline` is the short line on a list card;
// `goodIf` completes "Good if you want ..." on the detail panel. For classes,
// `role` says what you do in a fight and `difficulty` how much there is to
// keep track of.

export const RACE_GUIDANCE = {
  dragonborn: {
    tagline: "Dragon-blooded fire breather",
    goodIf: "to look like a dragon, hit hard, and breathe fire",
  },
  dwarf: {
    tagline: "Tough and steady",
    goodIf: "to be hard to kill, with a resistance to poison",
  },
  elf: {
    tagline: "Quick and perceptive",
    goodIf:
      "to be graceful and sharp-eyed, with senses that rarely miss anything",
  },
  gnome: {
    tagline: "Clever tinkerer",
    goodIf: "to be curious and clever, with a knack for resisting magic",
  },
  "half-elf": {
    tagline: "Charming and flexible",
    goodIf:
      "to be charming and adaptable, with a free boost to two abilities of your choice",
  },
  "half-orc": {
    tagline: "Fierce and hard to put down",
    goodIf:
      "to be a fierce fighter who can survive a hit that should have dropped you",
  },
  halfling: {
    tagline: "Small, lucky and brave",
    goodIf:
      "to be small, brave and lucky, with a reroll when you roll a natural 1",
  },
  human: {
    tagline: "Simple and flexible",
    goodIf: "a simple, flexible start with a small bonus to every ability",
  },
  tiefling: {
    tagline: "Devilish, with innate magic",
    goodIf: "a devilish look, resistance to fire, and a little built-in magic",
  },

  // Tome of Heroes races (via Open5e), keyed by their Open5e IDs.
  toh_alseid: {
    tagline: "Swift deer-folk of the forest",
    goodIf: "to be fast on four hooves and at home in the wild woods",
  },
  toh_catfolk: {
    tagline: "Nimble hunter with claws",
    goodIf: "to be quick and stealthy, with claws and sharp senses",
  },
  toh_darakhul: {
    tagline: "Undead ghoul who keeps their mind",
    goodIf:
      "to play a dark, undead character who is hard to kill but hates sunlight",
  },
  toh_derro: {
    tagline: "Small, strange and unpredictable",
    goodIf:
      "to be a small, slightly unhinged underground dweller who shrugs off magic",
  },
  toh_drow: {
    tagline: "Shadow elf from deep below",
    goodIf:
      "to be a sharp-minded elf from the underground with great dark vision",
  },
  toh_erina: {
    tagline: "Spiky, friendly hedgehog-folk",
    goodIf: "to be small, social and tough, with spines and a knack for digging",
  },
  toh_gearforged: {
    tagline: "A soul in a clockwork body",
    goodIf:
      "to be a living machine that doesn't need to eat or breathe, built from any ancestry",
  },
  toh_minotaur: {
    tagline: "Horned charger with a sense of direction",
    goodIf: "to be big and strong, charging in with horns and never getting lost",
  },
  toh_mushroomfolk: {
    tagline: "Calm, hardy fungus-folk",
    goodIf: "to play something truly unusual: a patient, hardy mushroom person",
  },
  toh_satarre: {
    tagline: "Lanky keeper of dark secrets",
    goodIf: "to be a tough, clever outsider drawn to death and forbidden lore",
  },
};

export const CLASS_GUIDANCE = {
  barbarian: {
    tagline: "Hits hard, hard to kill",
    goodIf: "to charge in, hit hard, and shrug off damage",
    role: "Frontline brawler",
    difficulty: "Easy to play",
    abilityTip:
      "Put your highest score in Strength, then Constitution so you stay standing.",
  },
  bard: {
    tagline: "Face of the party and support caster",
    goodIf:
      "to inspire allies, talk your way through problems, and cast helpful spells",
    role: "Support and talker",
    difficulty: "A bit more to track",
    abilityTip:
      "Charisma is your casting ability, so make it your highest. Dexterity is a good second.",
  },
  cleric: {
    tagline: "Healer and protector",
    goodIf: "to heal your friends, protect the party, and use divine power",
    role: "Healer and support",
    difficulty: "A bit more to track",
    abilityTip:
      "Wisdom is your casting ability, so make it your highest. Constitution or Strength comes next.",
  },
  druid: {
    tagline: "Nature caster and shapeshifter",
    goodIf: "nature magic and the power to turn into animals",
    role: "Nature spellcaster",
    difficulty: "Lots to manage",
    abilityTip:
      "Wisdom is your casting ability, so make it your highest. Constitution is a good second.",
  },
  fighter: {
    tagline: "Weapon expert",
    goodIf: "to be great at fighting with the simplest rules in the game",
    role: "Weapon expert",
    difficulty: "Easy to play",
    abilityTip:
      "Choose Strength for heavy weapons or Dexterity for bows and light weapons, then Constitution.",
  },
  monk: {
    tagline: "Fast martial artist",
    goodIf: "to fight without armor, with quick punches and kicks",
    role: "Quick martial artist",
    difficulty: "A bit more to track",
    abilityTip: "Dexterity first, then Wisdom.",
  },
  paladin: {
    tagline: "Holy knight",
    goodIf: "to be a holy knight who fights, protects allies, and heals",
    role: "Frontline defender",
    difficulty: "A bit more to track",
    abilityTip:
      "Strength first, then Charisma. Constitution helps you stay in the fight.",
  },
  ranger: {
    tagline: "Scout and archer",
    goodIf:
      "to be a skilled hunter and scout, deadly with a bow or in the wilds",
    role: "Scout and archer",
    difficulty: "A bit more to track",
    abilityTip: "Dexterity first, then Wisdom.",
  },
  rogue: {
    tagline: "Sneaky skill expert",
    goodIf:
      "to be sneaky and clever, and land big hits when the moment is right",
    role: "Sneaky skill expert",
    difficulty: "Easy to play",
    abilityTip:
      "Dexterity first. Intelligence or Charisma helps with your skills.",
  },
  sorcerer: {
    tagline: "Spell blaster from raw talent",
    goodIf: "to cast powerful spells from natural, inborn talent",
    role: "Spell blaster",
    difficulty: "A bit more to track",
    abilityTip:
      "Charisma is your casting ability, so make it your highest. Constitution is a good second.",
  },
  warlock: {
    tagline: "Caster powered by a dark patron",
    goodIf:
      "a mysterious patron and dark magic, with fewer but stronger spells",
    role: "Spell blaster",
    difficulty: "A bit more to track",
    abilityTip:
      "Charisma is your casting ability, so make it your highest. Constitution is a good second.",
  },
  wizard: {
    tagline: "Spellbook master",
    goodIf: "to be a master of magic who learns many spells",
    role: "Versatile spellcaster",
    difficulty: "Lots to manage",
    abilityTip:
      "Intelligence is your casting ability, so make it your highest. Constitution or Dexterity comes next.",
  },
};

// Short, friendly tips shown beside the narrow creation steps (so the page is
// not mostly empty space). `classId` lets a tip speak to the chosen class.
export function getStepTips(stepKey, classId) {
  const classGuide = getClassGuidance(classId);

  const tips = {
    name: {
      title: "Not sure yet?",
      tips: [
        "A placeholder is fine. You can rename your character on the sheet's Story tab any time.",
        "Pick a name that is easy to say out loud at the table.",
        "You don't have to decide everything now. Each step explains its choices as you go.",
      ],
    },
    subraceCantrip: {
      title: "About this free cantrip",
      tips: [
        "It's a bonus on top of any spells your class gives you.",
        "A cantrip is a spell you can cast as often as you like, with no spell slot.",
        "Tap Read more on any option to see exactly what it does.",
      ],
    },
    classSkills: {
      title: "Picking skills",
      tips: [
        "Perception and Stealth come up in almost every adventure.",
        "The letters next to a skill show which ability it uses. Pick skills that match your strongest scores.",
        "Skills your background already gave you are locked, so you can't waste a pick.",
        "You can add or change skills later by clicking the P badge on your sheet.",
      ],
    },
    classSpells: {
      title: "Picking spells",
      tips: [
        "Cantrips are free to cast as often as you like. Level 1 spells use a spell slot, and you start with only a couple.",
        "The colored tag shows what a spell is for: Damage, Healing, Buff, Defense, Control, Social or Utility.",
        "Not sure? One attack, one helpful spell, and one fun utility spell is a solid mix.",
        "Tap Read more to see the full rules text before you commit.",
      ],
    },
    abilities: {
      title: "Where do the scores go?",
      tips: [
        ...(classGuide?.abilityTip ? [classGuide.abilityTip] : []),
        "A score's modifier is what you actually add to rolls: 10 or 11 is +0, 12 or 13 is +1, 14 or 15 is +2.",
        "Your race's bonuses are added automatically after you assign the numbers.",
        "Not sure? The Balanced set is the easy, safe way to start.",
      ],
    },
  };

  return tips[stepKey] ?? null;
}

export function getRaceGuidance(raceIndex) {
  return RACE_GUIDANCE[raceIndex] ?? null;
}

export function getClassGuidance(classIndex) {
  return CLASS_GUIDANCE[classIndex] ?? null;
}

// Two-sentence summaries for the backgrounds QuestKeeper has full rules for
// (SRD, Tome of Heroes, Tal'Dorei, Open5e), in our own words. Shown when a
// player hovers a background card, the same way the book backgrounds are.
export const BACKGROUND_SUMMARIES = {
  acolyte: "You served in a temple, tending to its rites and its people. Good for a faithful character with a community behind them.",
  criminal: "You broke the law to get by and still know the shadier side of town. Good for a streetwise character with useful contacts.",
  sage: "You spent years studying in libraries and with learned teachers. Good for a scholar who loves research.",
  soldier: "You trained and fought as part of an army. Good for a disciplined fighter who knows how to follow a plan.",
  "open5e_con-artist": "You made a living from schemes and fake identities, with a cover story always ready. Good for a smooth talker who loves a good con.",
  "tdcs_crime-syndicate-member": "You worked your way up inside a criminal organization that owes you a favor or two. Good for a streetwise character with powerful friends.",
  "tdcs_elemental-warden": "You grew up protecting a place where wild elemental magic runs strong. Good for a nature-minded character in tune with the elements.",
  "tdcs_lyceum-student": "You studied at a great academy and still have friends on its staff. Good for a curious, well-read character.",
  "tdcs_recovered-cultist": "You once worshipped something dark, and you got out. Good for a character with a past to make up for.",
  "toh_court-servant": "You served in a noble household, seeing everything while staying unnoticed. Good for a quiet, observant character who knows how the powerful live.",
  "toh_desert-runner": "You grew up crossing harsh deserts where every drop of water counts. Good for a tough, resourceful survivor.",
  toh_destined: "Fate has big plans for you, whether you like it or not. Good for a character running toward, or away from, their destiny.",
  toh_diplomat: "You've smoothed over arguments between rivals and kingdoms. Good for a peacemaker who'd rather talk than fight.",
  "toh_forest-dweller": "You lived deep in the woods, hunting and foraging. Good for a quiet, outdoorsy character who knows the forest.",
  "toh_former-adventurer": "You've been adventuring before, and you're coming back for more. Good for a seasoned character with old friends and old enemies.",
  toh_freebooter: "You sailed as a pirate, and people in every port know your old ship. Good for a bold character with a seafaring past.",
  toh_gamekeeper: "You looked after the animals used for the hunt and know them well. Good for a patient character who loves animals.",
  toh_innkeeper: "You ran an inn and got to know every kind of traveler. Good for a friendly character who always knows someone useful.",
  "toh_mercenary-company-scion": "You were born into a famous family of mercenaries. Good for a fighter with a family name to live up to.",
  "toh_mercenary-recruit": "You know every story about famous soldiers, and now you want to be one. Good for an eager, untested fighter.",
  "toh_monstrous-adoptee": "You were raised by monsters and learned their ways. Good for an unusual character who sees the world differently.",
  "toh_mysterious-origins": "You can't remember your past, but someone out there remembers you. Good for a character with a mystery to solve.",
  "toh_northern-minstrel": "You traveled the cold north, collecting its songs and stories. Good for a musical character who loves history.",
  toh_occultist: "You chase forbidden knowledge, strange cults and dark secrets. Good for a curious character drawn to the mysterious.",
  toh_parfumier: "You crafted perfumes from plants and chemicals before adventuring. Good for a clever maker with a keen nose.",
  toh_scoundrel: "You know a city's hidden corners and how to get by in them. Good for a scrappy, street-smart character.",
  toh_sentry: "You stood guard for someone important, and guards everywhere recognize one of their own. Good for a watchful, dependable protector.",
  "toh_trophy-hunter": "You've hunted dangerous beasts in the harshest places. Good for a tough, outdoorsy character who loves a challenge.",
};

// The short text shown when hovering a race, class or background card, so
// every card in a list behaves the same. Book entries and homebrew bring
// their own summary; everything else uses the beginner tips above.
export function getCardPreview(category, item) {
  if (item?.preview) return item.preview;
  const index = item?.index;

  if (category === "Race" && RACE_GUIDANCE[index]) {
    return `Good if you want ${RACE_GUIDANCE[index].goodIf}.`;
  }
  if (category === "Class" && CLASS_GUIDANCE[index]) {
    return `Good if you want ${CLASS_GUIDANCE[index].goodIf}.`;
  }
  if (category === "Background" && BACKGROUND_SUMMARIES[index]) {
    return BACKGROUND_SUMMARIES[index];
  }
  // Only reached by homebrew with no summary yet.
  if (["Race", "Class", "Background"].includes(category)) {
    return "No summary yet. Open it to see the details.";
  }
  return null;
}

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

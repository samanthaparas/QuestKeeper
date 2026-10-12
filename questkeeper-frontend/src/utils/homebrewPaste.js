// "Fill in from pasted text": reads the rules text a player pastes (say, from
// the Wikidot page of a book they own) and suggests values for the homebrew
// form. The player reviews the suggestions and picks which to use.
//
// Only facts are filled in: numbers, sizes, skills, languages and the names
// (and levels) of traits and features. Descriptions are left for the player
// to write in their own words, since homebrew is shared with their tables
// and the book's text is copyrighted. The pasted text stays on screen as a
// reference while they write (it isn't saved).
//
// parsePastedText(category, text) ->
//   { data, found: [{ key, label, value }], sections: [{ name, text }] }
// data: suggested form values, keyed like the form's `data`.
// found: one line per suggestion, for the review list.
// sections: the pasted text split by heading, for the reference panel.

import { ABILITY_KEYS, SIZES } from "./homebrewMappers";
import { SKILLS } from "./characterSheet";

const ABILITY_WORDS = {
  strength: "str",
  dexterity: "dex",
  constitution: "con",
  intelligence: "int",
  wisdom: "wis",
  charisma: "cha",
};

const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };

const LANGUAGES = [
  "Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling",
  "Orc", "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal",
  "Primordial", "Sylvan", "Undercommon", "Aquan", "Auran", "Ignan", "Terran",
  "Thieves' Cant", "Druidic", "Sign Language",
];

// Race and subrace headings that aren't traits of their own.
const RACE_INFO_HEADINGS = [
  "ability score increase", "ability score increases", "age", "alignment",
  "size", "speed", "languages", "creature type", "source",
];

// "Two of your choice" -> 2
function countFrom(text) {
  const match = String(text).toLowerCase().match(/\b(\d+|a|an|one|two|three|four|five)\b/);
  if (!match) return 0;
  return Number(match[1]) || NUMBER_WORDS[match[1]] || 0;
}

function listNames(names) {
  return names.join(", ");
}

// --- Splitting the text into headed sections ----------------------------------

// Paragraphs like "Darkvision. You can see..." or "Skill Proficiencies:
// Insight, Religion", plus lone short lines that read as a heading followed
// by their text ("Bonus Proficiencies" then "3rd-level Bard College feature").
export function splitSections(text) {
  const lines = String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = [];
  let current = null;
  for (const line of lines) {
    const inline = line.match(/^([A-Z][A-Za-z0-9'’ ,()/-]{1,48}?)\s*[.:]\s+(.+)$/);
    const looksLikeHeading = /^[A-Z][A-Za-z0-9'’ ,()/-]{1,48}$/.test(line) && line.split(" ").length <= 6;

    if (inline && inline[1].split(" ").length <= 6) {
      current = { name: inline[1].trim(), text: inline[2].trim(), inline: true };
      sections.push(current);
    } else if (looksLikeHeading) {
      current = { name: line, text: "" };
      sections.push(current);
    } else if (current) {
      current.text = current.text ? `${current.text}\n${line}` : line;
    } else {
      current = { name: "", text: line };
      sections.push(current);
    }
  }
  return sections;
}

function findSection(sections, ...names) {
  return sections.find((section) => names.includes(section.name.toLowerCase()));
}

// --- Facts shared by races and subraces ---------------------------------------

// "Your Dexterity score increases by 2, and your Wisdom score increases by 1"
// -> fixed bonuses. The newer "increase one score by 2 and a different one by
// 1, or three scores by 1" rule -> a choice of three +1s, which players can
// adjust.
function readAbilities(sections, data, found) {
  const section = findSection(sections, "ability score increase", "ability score increases");
  if (!section) return;
  const text = section.text.toLowerCase();

  const fixed = {};
  for (const [word, key] of Object.entries(ABILITY_WORDS)) {
    const match = text.match(new RegExp(`${word} score (?:increases|increase) by (\\d)`));
    if (match) fixed[key] = Number(match[1]);
  }
  if (Object.keys(fixed).length > 0) {
    data.abilityBonuses = fixed;
    found.push({
      key: "abilityBonuses",
      label: "Ability bonuses",
      value: Object.entries(fixed).map(([key, bonus]) => `${key.toUpperCase()} +${bonus}`).join(", "),
    });
    return;
  }

  if (/increase one (?:ability )?score by 2/.test(text) || /different (?:one|scores?) by 1/.test(text)) {
    data.abilityBonuses = {};
    data.abilityChoice = { choose: 3, bonus: 1, from: [...ABILITY_KEYS] };
    found.push({
      key: "abilityChoice",
      label: "Ability bonuses",
      value: "Players choose (set as +1 to three abilities; change it to +2 and +1 if you prefer)",
    });
  }
}

function readTraits(sections, data, found) {
  // Traits are written "Name. What it does." A heading on its own line is
  // something else (a book title, a table, the race's own name).
  const traits = sections.filter(
    (section) =>
      section.inline && section.text && !RACE_INFO_HEADINGS.includes(section.name.toLowerCase()),
  );
  if (traits.length === 0) return;
  // Names only (each once): the descriptions are for the player to write.
  const names = [...new Set(traits.map((section) => section.name))];
  data.traits = names.slice(0, 20).map((name) => ({ name, description: "" }));
  found.push({ key: "traits", label: "Traits", value: listNames(names.slice(0, 20)) });
}

function readLanguages(sectionText, data, found) {
  if (!sectionText) return;
  // "Choose two languages, one of which..." lists options, not known ones.
  const allChoice = /^\s*choose\b/i.test(sectionText);
  const known = allChoice
    ? []
    : LANGUAGES.filter((name) => new RegExp(`\\b${name}\\b`, "i").test(sectionText));
  const extra = sectionText.match(
    /choose (\w+) languages?|(\w+) (?:other|extra|additional) languages?|languages? of your choice|(\w+) of your choice/i,
  );
  const choices = extra ? countFrom(extra[0]) || 1 : 0;

  if (known.length > 0) data.languages = known.join(", ");
  if (choices > 0) data.languageChoices = choices;
  if (known.length > 0 || choices > 0) {
    found.push({
      key: "languages",
      label: "Languages",
      value: [listNames(known), choices > 0 ? `${choices} of their choice` : ""].filter(Boolean).join(", plus "),
    });
  }
}

// The part of the page that holds one version of the race: from its first
// "Ability Score Increase" up to the next one (some pages show the newer and
// older versions one after the other), or everything if there's none.
function oneVersion(sections) {
  const isAbilities = (section) => /^ability score increases?$/i.test(section.name);
  const start = sections.findIndex(isAbilities);
  if (start === -1) return sections;
  const next = sections.findIndex((section, index) => index > start && isAbilities(section));
  // Size, speed or languages can come just before the abilities line.
  const before = sections
    .slice(0, start)
    .filter((section) => ["size", "speed", "languages"].includes(section.name.toLowerCase()));
  return [...before, ...sections.slice(start, next === -1 ? undefined : next)];
}

function parseRace(allSections, data, found) {
  const sections = oneVersion(allSections);
  const size = findSection(sections, "size");
  // The first size the text names ("Medium or Small" -> Medium).
  const sizeName =
    size &&
    SIZES.map((name) => ({ name, at: size.text.search(new RegExp(`\\b${name}\\b`)) }))
      .filter(({ at }) => at !== -1)
      .sort((a, b) => a.at - b.at)[0]?.name;
  if (sizeName) {
    data.size = sizeName;
    const alsoSmall = sizeName === "Medium" && /\bSmall\b/.test(size.text);
    found.push({ key: "size", label: "Size", value: alsoSmall ? "Medium (the text also allows Small)" : sizeName });
  }

  const speed = findSection(sections, "speed");
  const feet = speed?.text.match(/(\d+)\s*(?:feet|ft)/i);
  if (feet) {
    data.speed = Number(feet[1]);
    found.push({ key: "speed", label: "Speed", value: `${feet[1]} ft` });
  }

  readAbilities(sections, data, found);
  readLanguages(findSection(sections, "languages")?.text, data, found);
  readTraits(sections, data, found);
}

// --- Backgrounds -----------------------------------------------------------------

// Rules sites add item tooltips ("inkValue:10gp Weight:0.06lb") and pack
// contents to gear lists when copied; keep just the gear.
function cleanGear(text) {
  return text
    .replace(/Value:\s*[^\s,]*\s*Weight:\s*[^\s,]*/g, "")
    .replace(/Contents:.*$/, "")
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseBackground(sections, data, found) {
  const skillsSection = findSection(sections, "skill proficiencies", "skills");
  if (skillsSection) {
    const text = skillsSection.text;
    // "Insight, Religion" -> fixed; "plus one from among Arcana, History" -> a pick.
    // "Choose two of Arcana, History or Nature" is all choice.
    const [fixedPart, choicePart] = /^\s*choose\b/i.test(text)
      ? ["", text]
      : text.split(/,?\s*(?:plus|and)\s+(?=(?:one|two|\d)\b[^.]*(?:from|of|among))/i);
    const named = (part) => SKILLS.filter((skill) => new RegExp(`\\b${skill.name}\\b`, "i").test(part ?? ""));
    const fixed = named(fixedPart).slice(0, 4);
    if (fixed.length > 0) {
      data.skills = fixed.map((skill) => skill.index);
      found.push({ key: "skills", label: "Skills", value: listNames(fixed.map((skill) => skill.name)) });
    }
    const options = named(choicePart).filter((skill) => !fixed.includes(skill));
    if (options.length > 0) {
      const choose = Math.min(countFrom(choicePart) || 1, options.length);
      data.skillChoice = { choose, from: options.map((skill) => skill.index) };
      found.push({
        key: "skillChoice",
        label: "Skill pick",
        value: `${choose} from ${listNames(options.map((skill) => skill.name))}`,
      });
    }
  }

  const tools = findSection(sections, "tool proficiencies", "tools");
  if (tools && !/^none\b/i.test(tools.text)) {
    data.tools = tools.text.split("\n")[0].slice(0, 500);
    found.push({ key: "tools", label: "Tools", value: data.tools });
  }

  readLanguages(findSection(sections, "languages")?.text, data, found);

  const equipment = findSection(sections, "equipment");
  if (equipment) {
    // A gear list is a list of facts, so it's filled in as written.
    data.equipment = cleanGear(equipment.text.split("\n")[0]).slice(0, 1000);
    found.push({ key: "equipment", label: "Equipment", value: data.equipment });
  }

  // "Feature: Shelter of the Faithful", or (as Wikidot lays it out) the last
  // heading under "Features" before "Suggested Characteristics" that isn't a
  // roll-on table.
  const labelled = sections.find((section) => /^feature\b/i.test(section.name) && !/^features$/i.test(section.name));
  // The last "Features" heading (the first is often the page's contents list).
  const start = sections.findLastIndex((section) => /^features$/i.test(section.name));
  const end = sections.findIndex(
    (section, index) => index > start && /^suggested characteristics$/i.test(section.name),
  );
  const underFeatures =
    start === -1
      ? []
      : sections
          .slice(start + 1, end === -1 ? undefined : end)
          .filter((section) => section.name && section.text && !/\broll a d\d|^d\d/i.test(section.text));
  const name = labelled
    ? labelled.name.replace(/^feature\s*[:-]?\s*/i, "") || labelled.text.split("\n")[0]
    : underFeatures.at(-1)?.name;
  if (name) {
    data.feature = { name: name.slice(0, 80), description: "" };
    found.push({ key: "feature", label: "Feature", value: data.feature.name });
  }
}

// --- Subclasses ---------------------------------------------------------------------

// Parts of a class's Spellcasting section, not features of their own.
const SPELL_SUBHEADINGS =
  /^(cantrips|preparing|spellcasting ability|ritual casting|spellcasting focus|spells known|spell slots|tools required|learning spells|your spellbook|the spellbook)/i;

// Each feature with the level it's gained. Wikidot lists a feature as its
// name, then a line like "3rd-level Bard College feature" or "At 3rd level,
// ..."; some pages write "Bonus Proficiencies (3rd level)".
function readFeatures(sections, { limit, skip = () => false }) {
  const features = [];
  for (const section of sections) {
    if (skip(section)) continue;
    const inName = section.name.match(/^(.*?)\s*\((\d+)(?:st|nd|rd|th)[- ]level\)$/i);
    const inText = section.text.slice(0, 200).match(/\b(\d+)(?:st|nd|rd|th)[- ]level\b/i);
    if (inName) features.push({ name: inName[1], level: Number(inName[2]) });
    else if (section.name && inText) features.push({ name: section.name, level: Number(inText[1]) });
  }
  // Each name once (pages often list them in a table first).
  const seen = new Set();
  return features
    .filter((feature) => !seen.has(feature.name) && seen.add(feature.name))
    .slice(0, limit)
    .map((feature) => ({ ...feature, description: "" }))
    .sort((a, b) => a.level - b.level);
}

function parseSubclass(sections, data, found) {
  const features = readFeatures(sections, { limit: 30 });
  if (features.length === 0) return;
  data.features = features;
  found.push({
    key: "features",
    label: "Features",
    value: data.features.map((feature) => `${feature.name} (level ${feature.level})`).join(", "),
  });
}

// --- Classes -----------------------------------------------------------------------

const SAVE_KEYS = Object.fromEntries(Object.entries(ABILITY_WORDS));

// Spell slots, guessed from the page: Pact Magic (Warlock); a half caster
// (it prepares "half your paladin level, rounded down", or its spellcasting
// starts "by 2nd level"), from level 2 like a Paladin or from level 1 like
// an Artificer; otherwise a full caster.
function guessProgression(sections, text, casting) {
  if (sections.some((section) => /^pact magic$/i.test(section.name))) return "pact";
  const startsAtSecond = /\b(by|at|when you reach|reach)\b[^.]{0,40}\b2nd level\b/i.test(casting.text.slice(0, 300));
  const isHalf = /half your \w+ level,? rounded down/i.test(text) || startsAtSecond;
  if (isHalf) return startsAtSecond ? "half" : "half-early";
  return "full";
}

const PROGRESSION_WORDS = {
  full: "full caster",
  half: "half caster from level 2",
  "half-early": "half caster from level 1",
  pact: "Pact Magic",
};

function parseClass(sections, data, found, text) {
  const hitDie = text.match(/hit dice:\s*1d(\d+)/i);
  if (hitDie && [6, 8, 10, 12].includes(Number(hitDie[1]))) {
    data.hitDie = Number(hitDie[1]);
    found.push({ key: "hitDie", label: "Hit die", value: `d${hitDie[1]}` });
  }

  const saves = findSection(sections, "saving throws");
  const saveKeys = saves
    ? Object.entries(SAVE_KEYS)
        .filter(([word]) => new RegExp(`\\b${word}\\b`, "i").test(saves.text))
        .map(([, key]) => key)
        .slice(0, 2)
    : [];
  if (saveKeys.length > 0) {
    data.savingThrows = saveKeys;
    found.push({ key: "savingThrows", label: "Saving throws", value: saveKeys.map((key) => key.toUpperCase()).join(", ") });
  }

  const skills = findSection(sections, "skills");
  if (skills) {
    const options = SKILLS.filter((skill) => new RegExp(`\\b${skill.name}\\b`, "i").test(skills.text));
    // "any three" -> every skill.
    const from = /\bany\b/i.test(skills.text) && options.length === 0 ? SKILLS : options;
    if (from.length > 0) {
      const choose = Math.min(countFrom(skills.text) || 2, 4);
      data.skillChoice = { choose, from: from.map((skill) => skill.index) };
      found.push({ key: "skillChoice", label: "Skills", value: `Choose ${choose} from ${listNames(from.map((skill) => skill.name))}` });
    }
  }

  for (const [key, heading] of [["armor", "armor"], ["weapons", "weapons"], ["tools", "tools"]]) {
    const section = findSection(sections, heading);
    const value = section?.text.split("\n")[0].trim();
    if (value && !/^none\b/i.test(value)) {
      data[key] = value.slice(0, 200);
      found.push({ key, label: heading.charAt(0).toUpperCase() + heading.slice(1), value: data[key] });
    }
  }

  // The gear list: the lines under "Equipment", minus the sentences around it.
  const equipment = findSection(sections, "equipment");
  if (equipment) {
    const items = equipment.text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^(you start|alternatively|in addition)/i.test(line));
    if (items.length > 0) {
      data.equipment = cleanGear(items.join(", ")).slice(0, 1000);
      found.push({ key: "equipment", label: "Starting gear", value: data.equipment });
    }
  }

  const casting = sections.find((section) => /^(spellcasting|pact magic)$/i.test(section.name));
  if (casting) {
    const ability = text.match(/\b(intelligence|wisdom|charisma) is your spellcasting ability/i);
    const cantrips = text.match(/you know (\w+) cantrips?/i);
    const progression = guessProgression(sections, text, casting);
    data.progression = progression;
    if (ability) data.spellcastingAbility = ability[1].toLowerCase();
    data.spellcastingType = /you prepare the list|prepare a list|choose a number of \w+ spells to prepare/i.test(text)
      ? "prepared"
      : "known";
    if (cantrips) data.cantripsAtFirst = countFrom(cantrips[1]);
    found.push({
      key: "spellcasting",
      label: "Spellcasting",
      value: [
        PROGRESSION_WORDS[progression],
        ability && `casts with ${ability[1]}`,
        data.spellcastingType === "prepared" ? "prepares spells" : "knows spells",
        cantrips && `${data.cantripsAtFirst} cantrips at level 1`,
      ]
        .filter(Boolean)
        .join(", ") + " (a guess from the text, so check it)",
    });
  }

  const features = readFeatures(sections, {
    limit: 40,
    skip: (section) =>
      SPELL_SUBHEADINGS.test(section.name) || /^ability score improvement$/i.test(section.name),
  });
  if (features.length > 0) {
    data.features = features;
    found.push({
      key: "features",
      label: "Features",
      value: features.map((feature) => `${feature.name} (level ${feature.level})`).join(", "),
    });
  }

  // The level a subclass is chosen: the feature named like one ("Sacred
  // Oath", "Arcane Tradition", "Artificer Specialist"), or else the one that
  // says "you choose" a type, path, tradition and so on.
  const SUBCLASS_WORDS = "archetype|tradition|path|college|domain|circle|oath|conclave|origin|patron|specialist|order";
  const isFeature = (section) => features.some((feature) => feature.name === section.name);
  const subclassFeature =
    sections.find(
      (section) => isFeature(section) && new RegExp(`\\b(${SUBCLASS_WORDS})$`, "i").test(section.name),
    ) ??
    sections.find(
      (section) =>
        isFeature(section) &&
        new RegExp(`\\bchoose\\b[^.]{0,60}\\b(type|subclass|${SUBCLASS_WORDS})`, "i").test(section.text.slice(0, 300)),
    );
  if (subclassFeature) {
    const level = features.find((feature) => feature.name === subclassFeature.name).level;
    data.subclassLevel = level;
    data.subclassFlavor = subclassFeature.name.slice(0, 40);
    found.push({ key: "subclass", label: "Subclass", value: `${subclassFeature.name}, chosen at level ${level}` });
  }
}

const PARSERS = {
  race: parseRace,
  subrace: (allSections, data, found) => {
    const sections = oneVersion(allSections);
    readAbilities(sections, data, found);
    readTraits(sections, data, found);
  },
  background: parseBackground,
  class: parseClass,
  subclass: parseSubclass,
};

export function parsePastedText(category, text) {
  const sections = splitSections(text);
  const data = {};
  const found = [];
  PARSERS[category]?.(sections, data, found, String(text ?? ""));
  return { data, found, sections: sections.filter((section) => section.name || section.text) };
}

// Which form `data` fields each suggestion fills, so unticked ones are skipped.
const FIELDS_BY_KEY = {
  abilityBonuses: ["abilityBonuses"],
  abilityChoice: ["abilityBonuses", "abilityChoice"],
  spellcasting: ["progression", "spellcastingAbility", "spellcastingType", "cantripsAtFirst"],
  subclass: ["subclassLevel", "subclassFlavor"],
};

// Lists of traits or features: keep what the player already wrote, drop
// empty rows, and add the new names that aren't there yet.
const LIST_FIELDS = ["traits", "features"];

function mergeList(current = [], incoming = []) {
  const kept = current.filter((item) => item.name?.trim() || item.description?.trim());
  const names = new Set(kept.map((item) => item.name.trim().toLowerCase()));
  return [...kept, ...incoming.filter((item) => !names.has(item.name.toLowerCase()))];
}

// The form's data with the chosen suggestions applied.
export function applySuggestions(formData, parsed, chosenKeys) {
  const next = { ...formData };
  for (const key of chosenKeys) {
    for (const field of FIELDS_BY_KEY[key] ?? [key]) {
      if (!(field in parsed.data)) continue;
      next[field] = LIST_FIELDS.includes(field)
        ? mergeList(formData[field], parsed.data[field])
        : parsed.data[field];
    }
    // Languages and their "of your choice" count travel together.
    if (key === "languages" && "languageChoices" in parsed.data) {
      next.languageChoices = parsed.data.languageChoices;
    }
  }
  return next;
}

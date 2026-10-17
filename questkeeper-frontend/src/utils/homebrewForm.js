// Form state for the homebrew builder: blank forms, loading a saved entry for
// editing, turning the form back into something to save, and checking it.
// Languages are typed as "Common, Elvish" in the form and saved as a list.

import {
  cleanHomebrewData,
  toHomebrewRace,
  toHomebrewSubrace,
  toHomebrewBackground,
  toHomebrewClass,
  toHomebrewSubclass,
  toHomebrewFeat,
} from "./homebrewMappers";

export const CATEGORY_LABELS = {
  race: "Race",
  subrace: "Subrace",
  background: "Background",
  class: "Class",
  subclass: "Subclass",
  feat: "Feat",
};

const BLANK_DATA = {
  race: {
    speed: 30,
    size: "Medium",
    abilityBonuses: {},
    abilityChoice: null,
    languages: "Common",
    languageChoices: 0,
    traits: [{ name: "", description: "" }],
    skills: [],
    skillChoice: null,
  },
  subrace: {
    parentRace: "",
    parentRaceName: "",
    abilityBonuses: {},
    abilityChoice: null,
    traits: [{ name: "", description: "" }],
    skills: [],
    skillChoice: null,
  },
  background: {
    skills: [],
    skillChoice: null,
    languages: "",
    languageChoices: 0,
    tools: "",
    equipment: "",
    feature: { name: "", description: "" },
  },
  class: {
    hitDie: 8,
    savingThrows: [],
    skillChoice: { choose: 2, from: [] },
    armor: "",
    weapons: "",
    tools: "",
    equipment: "",
    progression: "none",
    spellcastingAbility: "intelligence",
    spellcastingType: "prepared",
    spellList: "wizard",
    cantripsAtFirst: 0,
    spellsKnownAtFirst: 0,
    subclassLevel: 3,
    subclassFlavor: "",
    features: [{ name: "", level: 1, description: "" }],
    bookClass: "",
  },
  subclass: {
    parentClass: "",
    parentClassName: "",
    features: [{ name: "", level: 3, description: "" }],
  },
  feat: {
    prerequisite: "",
  },
};

export function emptyHomebrewForm(category) {
  return {
    id: null,
    category,
    name: "",
    basedOn: "",
    linkUrl: "",
    summary: "",
    isShared: true,
    data: structuredClone(BLANK_DATA[category]),
  };
}

// A saved row -> form values (languages back into "Common, Elvish").
export function entryToForm(entry) {
  const data = structuredClone(entry.data ?? {});
  if (Array.isArray(data.languages)) data.languages = data.languages.join(", ");

  return {
    id: entry.id,
    category: entry.category,
    name: entry.name ?? "",
    basedOn: entry.based_on ?? "",
    linkUrl: entry.link_url ?? "",
    summary: entry.summary ?? "",
    isShared: Boolean(entry.is_shared),
    data: { ...structuredClone(BLANK_DATA[entry.category]), ...data },
  };
}

function splitLanguages(value) {
  if (Array.isArray(value)) return value;
  return String(value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

// Form values -> what homebrewStore saves (it cleans the data again).
export function formToEntry(form) {
  const data = { ...form.data };
  if ("languages" in data) data.languages = splitLanguages(data.languages);

  return {
    category: form.category,
    name: form.name,
    basedOn: form.basedOn,
    linkUrl: form.linkUrl,
    summary: form.summary,
    isShared: form.isShared,
    data,
  };
}

// The first problem to fix, in plain words, or "" when it's ready to save.
export function validateHomebrewForm(form) {
  if (!form.name.trim()) return "Give it a name.";
  if (form.linkUrl.trim() && !/^https?:\/\//i.test(form.linkUrl.trim())) {
    return "Links need to start with http:// or https://";
  }
  if (form.category === "subrace" && !form.data.parentRace) {
    return "Choose which race this subrace belongs to.";
  }
  if (form.category === "class" && form.data.savingThrows.length !== 2) {
    return "Pick the class's two saving throws.";
  }
  if (form.category === "subclass" && !form.data.parentClass) {
    return "Choose which class this subclass is for.";
  }
  if (form.category === "feat" && !form.summary.trim()) {
    return "Describe what the feat does.";
  }
  return "";
}

const CONVERTERS = {
  race: toHomebrewRace,
  subrace: toHomebrewSubrace,
  background: toHomebrewBackground,
  class: toHomebrewClass,
  subclass: toHomebrewSubclass,
  feat: toHomebrewFeat,
};

// The form as the game will see it, for the live preview.
export function previewHomebrew(form) {
  const entry = formToEntry(form);
  const row = {
    id: form.id ?? "preview",
    category: form.category,
    name: entry.name.trim() || `Unnamed ${CATEGORY_LABELS[form.category]}`,
    based_on: entry.basedOn.trim(),
    link_url: entry.linkUrl.trim(),
    summary: entry.summary.trim(),
    data: cleanHomebrewData(form.category, entry.data),
    is_shared: entry.isShared,
  };
  return CONVERTERS[form.category](row, []);
}

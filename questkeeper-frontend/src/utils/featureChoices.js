// Choices a feature asks the player to make, like a Ranger's Favored Enemy
// (one creature type) or Natural Explorer (one terrain). The SRD lists them
// on the feature as `feature_specific.<name>_options`. On the sheet a
// feature keeps them as:
//   choices: [{ key, label, choose, options: ["aberrations", ...], picked: [] }]
// Nothing is ever picked for the player.

import { normalizeItemName } from "./srdDetails";
import { isReplacedByOption } from "./characterSheet";

// "enemy_type_options" -> "Enemy type"
function labelFromKey(key) {
  const words = key.replace(/_options$/, "").replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// "humanoids" -> "Humanoids", "grassland" -> "Grassland"
export function formatOption(value) {
  return String(value)
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// The plain "pick N from this list" choices in an SRD feature. Choices that
// point at other features (a Dragon Ancestor colour) are offered as their
// own entries instead, so they're left out here.
export function choicesFromSrd(featureSpecific) {
  if (!featureSpecific || typeof featureSpecific !== "object") return [];
  return Object.entries(featureSpecific).flatMap(([key, spec]) => {
    const options = spec?.from?.options;
    if (!key.endsWith("_options") || spec?.type !== "string" || !Array.isArray(options)) return [];
    const strings = options.filter((option) => typeof option === "string");
    if (strings.length === 0) return [];
    return [
      {
        key,
        label: labelFromKey(key),
        choose: Math.max(1, Math.min(spec.choose ?? 1, strings.length)),
        options: strings,
        picked: [],
      },
    ];
  });
}

// A feature's choices: its own, or (for features added before choices were
// saved) the matching SRD feature's, so older characters can still pick.
// entries: from loadFeatureEntries.
export function choicesFor(feature, entries = []) {
  if (Array.isArray(feature?.choices) && feature.choices.length > 0) return feature.choices;
  const match = entries.find(
    (entry) => entry.choices?.length > 0 && normalizeItemName(entry.name) === normalizeItemName(feature?.name),
  );
  return match ? match.choices.map((choice) => ({ ...choice, picked: [] })) : [];
}

// The feature's choices with one pick changed (one pick per dropdown).
export function pickChoice(choices, key, slot, value) {
  return choices.map((choice) => {
    if (choice.key !== key) return choice;
    const picked = [...(choice.picked ?? [])];
    picked[slot] = value;
    return { ...choice, picked: picked.map((pick) => pick ?? "") };
  });
}

// Picks still to make on one feature.
export function missingPicks(choices = []) {
  return choices.reduce(
    (total, choice) => total + Math.max(0, choice.choose - (choice.picked ?? []).filter(Boolean).length),
    0,
  );
}

// "Undead" or "Forest, Swamp": the picks, for showing beside the name.
export function describePicks(choices = []) {
  return choices
    .flatMap((choice) => (choice.picked ?? []).filter(Boolean))
    .map(formatOption)
    .join(", ");
}

// ---------------------------------------------------------------------------
// Feature choices on level-up (Fighting Style, Expertise, Metamagic, Pact
// Boon, Eldritch Invocations, a Ranger's extra Favored Enemy and terrain).
// The level-up wizard asks for these so they don't sit on the sheet as
// "Not chosen yet". Book options that aren't in the SRD are typed in by name
// with an optional link; their text is never copied.

// Eldritch Invocations a Warlock knows, from the Player's Handbook table.
// (The SRD API's own numbers for this are off, so they aren't used.)
const INVOCATIONS_KNOWN = [
  [18, 8], [15, 7], [12, 6], [9, 5], [7, 4], [5, 3], [2, 2],
];

export function getInvocationsKnown(level) {
  return INVOCATIONS_KNOWN.find(([from]) => level >= from)?.[1] ?? 0;
}

// The SRD features a pick-one-or-more feature offers (each Fighting Style,
// each Metamagic, each Pact, each Invocation), as SRD feature indexes.
export function optionIndexesFromSrd(featureSpecific) {
  const subfeatures = featureSpecific?.subfeature_options;
  if (subfeatures?.type === "feature" && Array.isArray(subfeatures.from?.options)) {
    return {
      choose: subfeatures.choose ?? 1,
      indexes: subfeatures.from.options.map((option) => option.item?.index).filter(Boolean),
    };
  }
  if (Array.isArray(featureSpecific?.invocations) && featureSpecific.invocations.length > 0) {
    // How many invocations come from the Warlock table, not from here.
    return { choose: 0, indexes: featureSpecific.invocations.map((item) => item.index) };
  }
  return null;
}

// The skills an Expertise feature lets the player pick, as sheet skill
// indexes ("skill-stealth" -> "stealth"). Some SRD lists nest a second
// choice inside; those skills are offered too.
export function expertiseFromSrd(featureSpecific) {
  const spec = featureSpecific?.expertise_options;
  if (!spec || !Array.isArray(spec.from?.options)) return null;
  const nested = spec.from.options.find((option) => option.option_type === "choice");
  const choose = nested ? nested.choice.choose : spec.choose;
  const options = nested ? nested.choice.from.options : spec.from.options;
  const skills = options
    .map((option) => option.item?.index ?? "")
    .filter((index) => index.startsWith("skill-"))
    .map((index) => index.replace(/^skill-/, ""));
  return skills.length > 0 ? { choose: choose ?? 1, skills } : null;
}

// "Fighting Style: Archery" -> "Fighting Style: ", when every option of a
// feature starts the same way, so a typed book option gets the same prefix.
function sharedPrefix(names) {
  const prefixes = names.map((name) => (name.includes(": ") ? name.split(": ")[0] + ": " : ""));
  return prefixes.length > 0 && prefixes.every((prefix) => prefix && prefix === prefixes[0])
    ? prefixes[0]
    : "";
}

// Why an option may not suit the character yet ("needs Pact of the Blade").
// Only a level requirement hides an option; the rest are shown as a note,
// because QuestKeeper can't always tell (a spell from a book, for one).
function prerequisiteNote(prerequisites = [], entriesByKey) {
  const needs = prerequisites.flatMap((prerequisite) => {
    if (prerequisite.type === "feature") {
      const index = String(prerequisite.feature ?? "").split("/").pop();
      return [entriesByKey.get(`feature:${index}`)?.name ?? formatOption(index)];
    }
    if (prerequisite.type === "spell") {
      return [formatOption(String(prerequisite.spell ?? "").split("/").pop())];
    }
    return [];
  });
  return needs.length > 0 ? `needs ${needs.join(", ")}` : "";
}

// Every choice the new level asks for, as groups the wizard shows one
// dropdown per pick for:
//   { key, title, kind: "list" | "option" | "expertise", choose,
//     options: [{ value, label }], entry, bookPrefix }
// "list" is a pick from words (Favored Enemy), "option" a pick of SRD
// features (Fighting Style), "expertise" a pick of skills.
// entries: from loadFeatureEntries; sheet: the character before levelling.
export function getLevelUpFeatureChoices(entries, sheet, level) {
  const have = new Set((sheet.features ?? []).map((feature) => normalizeItemName(feature.name)));
  const entriesByKey = new Map(entries.map((entry) => [entry.key, entry]));
  // Features a switched-on optional feature replaces (Favored Enemy, when the
  // Ranger uses Tasha's Favored Foe) aren't asked about.
  const ownEntries = entries.filter(
    (entry) => !entry.otherSubclass && !entry.optionOf && !isReplacedByOption(sheet, entry.name),
  );

  const atThisLevel = ownEntries.filter((entry) => entry.level === level);
  // A Warlock learns new invocations at levels with no new feature, so the
  // level 2 "Eldritch Invocations" feature is used for its list.
  const newInvocations =
    sheet.class?.id === "warlock" ? getInvocationsKnown(level) - getInvocationsKnown(level - 1) : 0;
  const invocationEntry = ownEntries.find((entry) => entry.optionIndexes?.choose === 0);
  const candidates =
    newInvocations > 0 && invocationEntry && !atThisLevel.includes(invocationEntry)
      ? [...atThisLevel, invocationEntry]
      : atThisLevel;

  // Picks already made on earlier levels, so "Undead" isn't offered twice.
  const pickedBefore = new Set(
    (sheet.features ?? []).flatMap((feature) =>
      (feature.choices ?? []).flatMap((choice) => (choice.picked ?? []).map((pick) => `${choice.key}:${pick}`)),
    ),
  );

  return candidates.flatMap((entry) => {
    if (entry.choices?.length > 0) {
      return entry.choices.flatMap((choice) => {
        const options = choice.options
          .filter((option) => !pickedBefore.has(`${choice.key}:${option}`))
          .map((option) => ({ value: option, label: formatOption(option) }));
        // Every option already picked on earlier levels: nothing to ask.
        if (options.length === 0) return [];
        // "Favored Enemy (2 types)" adds one more to the earlier ones, so the
        // label says that, and lists what the character already has.
        const baseName = entry.name.replace(/\s*\([^)]*\)\s*$/, "");
        const existing = (sheet.features ?? [])
          .filter((feature) => feature.name.startsWith(baseName))
          .flatMap((feature) =>
            (feature.choices ?? []).filter((item) => item.key === choice.key).flatMap((item) => item.picked ?? []),
          )
          .filter(Boolean)
          .map(formatOption);
        const isMore = (sheet.features ?? []).some((feature) => feature.name.startsWith(baseName));
        const count = choice.choose === 1 ? "one" : String(choice.choose);
        return [{
          key: `${entry.key}|${choice.key}`,
          title: `${baseName}: choose ${count}${isMore ? " more" : ""} ${choice.label.toLowerCase()}`,
          hint: isMore ? `You have: ${existing.length ? existing.join(", ") : "none picked yet"}` : "",
          kind: "list",
          choiceKey: choice.key,
          choose: Math.min(choice.choose, options.length),
          options,
          entry,
        }];
      });
    }

    if (entry.optionIndexes) {
      const optionEntries = entry.optionIndexes.indexes
        .map((index) => entriesByKey.get(`feature:${index}`))
        .filter(Boolean);
      const options = optionEntries
        .filter((option) => !have.has(normalizeItemName(option.name)))
        .filter((option) =>
          (option.prerequisites ?? []).every((need) => need.type !== "level" || need.level <= level),
        )
        .map((option) => {
          const note = prerequisiteNote(option.prerequisites, entriesByKey);
          return { value: option.key, label: note ? `${option.name} (${note})` : option.name };
        });
      const choose = entry.optionIndexes.choose === 0 ? newInvocations : entry.optionIndexes.choose;
      if (choose <= 0) return [];
      return [
        {
          key: entry.key,
          title: entry.name,
          kind: "option",
          // Book options can always be typed in, so the list running short
          // doesn't lower how many picks there are.
          choose,
          options,
          entry,
          // The SRD option features by key, to save the picked one's text.
          optionEntries: Object.fromEntries(optionEntries.map((option) => [option.key, option])),
          bookPrefix: sharedPrefix(optionEntries.map((option) => option.name)),
        },
      ];
    }

    if (entry.expertise) {
      const options = entry.expertise.skills
        .filter((skill) => sheet.skills?.[skill] && !sheet.skillExpertise?.[skill])
        .map((skill) => ({ value: skill, label: formatOption(skill) }));
      const choose = Math.min(entry.expertise.choose, options.length);
      return choose > 0
        ? [{ key: entry.key, title: entry.name, kind: "expertise", choose, options, entry }]
        : [];
    }

    return [];
  });
}

// What the player picked, turned into what goes on the sheet, or null while
// a pick is still missing. picks: { [groupKey]: [value per slot] }, where a
// value is an option's value or BOOK_OPTION; bookDrafts: { "<key>#<slot>":
// { name, link } } for typed book options. Returns
//   { features: [{ name, description, source, choices, link }], expertise: [skill],
//     skipped: [feature name] }
export const BOOK_OPTION = "__book__";
// "Skip" for a word-list pick (a Ranger's Favored Enemy or Natural Explorer):
// many tables use Tasha's replacements (Favored Foe, Deft Explorer) instead,
// so the SRD feature is left off the sheet rather than forced on.
export const SKIP_OPTION = "__skip__";

export function resolveLevelUpFeatureChoices(groups, picks, bookDrafts, sheet, { safeLink, sourceOf }) {
  const have = new Set((sheet.features ?? []).map((feature) => normalizeItemName(feature.name)));
  const features = [];
  const listFeatures = new Map();
  const expertise = [];
  const skipped = [];
  const chosenNames = new Set();

  for (const group of groups) {
    const slots = Array.from({ length: group.choose }, (_, slot) => picks[group.key]?.[slot] ?? "");
    if (slots.some((value) => !value)) return null;
    // The same option in two dropdowns counts once, so it isn't allowed.
    const listed = slots.filter((value) => value !== BOOK_OPTION && value !== SKIP_OPTION);
    if (new Set(listed).size !== listed.length) return null;

    if (group.kind === "list" && slots.includes(SKIP_OPTION)) {
      // Skipped: nothing goes on the sheet for this feature.
      if (!skipped.includes(group.entry.name)) skipped.push(group.entry.name);
      listFeatures.delete(group.entry.key);
      continue;
    }

    if (group.kind === "list" && !skipped.includes(group.entry.name)) {
      // All of a feature's list picks are saved on that one feature.
      const feature = listFeatures.get(group.entry.key) ?? {
        name: group.entry.name,
        description: group.entry.description,
        source: sourceOf(group.entry),
        choices: group.entry.choices.map((choice) => ({ ...choice, picked: [] })),
      };
      feature.choices = feature.choices.map((choice) =>
        choice.key === group.choiceKey ? { ...choice, picked: slots } : choice,
      );
      listFeatures.set(group.entry.key, feature);
    }

    if (group.kind === "expertise") expertise.push(...slots);

    if (group.kind === "option") {
      for (const [slot, value] of slots.entries()) {
        if (value === BOOK_OPTION) {
          const draft = bookDrafts[`${group.key}#${slot}`] ?? {};
          const typed = String(draft.name ?? "").trim();
          const typedLink = String(draft.link ?? "").trim();
          const link = safeLink(typedLink);
          if (!typed || (typedLink && !link)) return null;
          // "Druidic Warrior" -> "Fighting Style: Druidic Warrior".
          const name =
            group.bookPrefix && !typed.toLowerCase().startsWith(group.bookPrefix.toLowerCase())
              ? `${group.bookPrefix}${typed}`
              : typed;
          features.push({ name, description: "", source: null, ...(link ? { link } : {}) });
        } else {
          const option = group.optionEntries[value];
          if (!option) return null;
          features.push({
            name: option.name,
            description: option.description,
            source: sourceOf(option),
          });
        }
      }
    }
  }

  // Every picked name must be new: not on the sheet, not picked twice.
  const resolved = [...listFeatures.values(), ...features];
  for (const feature of resolved) {
    if (!feature.name) continue;
    const key = normalizeItemName(feature.name);
    if (have.has(key) || chosenNames.has(key)) return null;
    chosenNames.add(key);
  }
  if (new Set(expertise).size !== expertise.length) return null;

  return { features: resolved, expertise, skipped };
}

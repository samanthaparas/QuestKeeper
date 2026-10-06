// Starting-gear choices from the SRD ("(a) chain mail or (b) leather armor,
// longbow, and 20 arrows"). The SRD nests these several levels deep; this file
// turns them into simple groups the creation step can show, and works out the
// gear a player ends up with.
//
// A group is one decision: { id, source, options: [option] }.
// An option is what the player can take for it:
//   { id, items: [{ index, name, quantity }],   fixed things it gives
//     picks: [{ id, category: { index, name }, count, label }],
//            "any martial weapon": the player picks `count` items
//     requires: "Warhammers" | null }           an "(if proficient)" note

function toItem(reference) {
  return {
    index: reference.of.index,
    name: reference.of.name,
    quantity: reference.count ?? 1,
  };
}

function toPick(choice, id) {
  const category = choice.from?.equipment_category;
  if (!category) return null;
  return {
    id,
    category: { index: category.index, name: category.name },
    count: choice.choose ?? 1,
    label: choice.desc ?? null,
  };
}

function requirementOf(option) {
  const prerequisite = (option.prerequisites ?? []).find(
    (entry) => entry.type === "proficiency",
  );
  return prerequisite?.proficiency?.name ?? null;
}

function toOption(raw, id) {
  const option = { id, items: [], picks: [], requires: requirementOf(raw) };
  const parts = raw.option_type === "multiple" ? raw.items : [raw];

  parts.forEach((part, index) => {
    if (part.option_type === "counted_reference") {
      option.items.push(toItem(part));
    } else if (part.option_type === "choice") {
      const pick = toPick(part.choice, `${id}-pick${index}`);
      if (pick) option.picks.push(pick);
    }
  });

  return option.items.length > 0 || option.picks.length > 0 ? option : null;
}

// `raw` is SRD class or background data; `source` is "class" or "background".
export function parseEquipmentChoices(raw, source) {
  return (raw?.starting_equipment_options ?? []).flatMap((entry, index) => {
    const id = `${source}-${index}`;
    const from = entry.from ?? {};

    // "Holy symbol": pick straight from a category, no (a)/(b).
    if (from.option_set_type === "equipment_category") {
      const pick = toPick(entry, `${id}-opt0-pick0`);
      return pick
        ? [
            {
              id,
              source,
              options: [
                { id: `${id}-opt0`, items: [], picks: [pick], requires: null },
              ],
            },
          ]
        : [];
    }

    const options = (from.options ?? [])
      .map((option, optionIndex) => toOption(option, `${id}-opt${optionIndex}`))
      .filter(Boolean);
    return options.length > 0 ? [{ id, source, options }] : [];
  });
}

function describeItem({ name, quantity }) {
  return quantity > 1 ? `${name} ×${quantity}` : name;
}

// "a martial weapon" from the SRD's own wording, or "a Holy Symbols item"
// style fallback when it has none.
export function describePick(pick) {
  if (pick.label) return pick.label;
  return pick.count > 1
    ? `${pick.count} from ${pick.category.name}`
    : `one from ${pick.category.name}`;
}

// One readable line per option: "Leather Armor, Longbow, Arrow ×20" or
// "a martial weapon and Shield".
export function describeOption(option) {
  const parts = [
    ...option.picks.map(describePick),
    ...option.items.map(describeItem),
  ];
  return parts.join(" and ").replace(/ and (?=.* and )/g, ", ");
}

// Every group starts on its first option, the classic pick, with its
// category picks still to choose.
export function defaultEquipmentSelections(groups) {
  return Object.fromEntries(
    groups.map((group) => [group.id, selectionFor(group.options[0])]),
  );
}

export function selectionFor(option) {
  return {
    optionId: option.id,
    picks: Object.fromEntries(
      option.picks.map((pick) => [
        pick.id,
        Array.from({ length: pick.count }, () => null),
      ]),
    ),
  };
}

function chosenOption(group, selection) {
  return (
    group.options.find((option) => option.id === selection?.optionId) ?? null
  );
}

// True once every group has an option and every "any ..." pick is filled in.
export function isEquipmentComplete(groups, selections = {}) {
  return groups.every((group) => {
    const option = chosenOption(group, selections[group.id]);
    if (!option) return false;
    return option.picks.every((pick) => {
      const picked = selections[group.id].picks?.[pick.id] ?? [];
      return picked.length === pick.count && picked.every(Boolean);
    });
  });
}

// The gear the player ends up with from their choices, with repeated items
// merged ("two handaxes" and a picked handaxe become Handaxe ×3).
// `categoryItems` maps a category index to its [{ index, name }] list.
export function resolveChosenEquipment(
  groups,
  selections = {},
  categoryItems = {},
) {
  const byIndex = new Map();
  const add = (item) => {
    const existing = byIndex.get(item.index);
    byIndex.set(
      item.index,
      existing
        ? { ...existing, quantity: existing.quantity + item.quantity }
        : { ...item },
    );
  };

  groups.forEach((group) => {
    const selection = selections[group.id];
    const option = chosenOption(group, selection);
    if (!option) return;

    option.items.forEach(add);
    option.picks.forEach((pick) => {
      (selection.picks?.[pick.id] ?? [])
        .filter(Boolean)
        .forEach((itemIndex) => {
          const found = (categoryItems[pick.category.index] ?? []).find(
            (item) => item.index === itemIndex,
          );
          add({
            index: itemIndex,
            name: found?.name ?? itemIndex,
            quantity: 1,
          });
        });
    });
  });

  return [...byIndex.values()];
}

// Every category any option might need a list for.
export function categoriesNeeded(groups) {
  const indexes = new Set();
  groups.forEach((group) =>
    group.options.forEach((option) =>
      option.picks.forEach((pick) => indexes.add(pick.category.index)),
    ),
  );
  return [...indexes];
}

import { describe, it, expect } from "vitest";
import {
  categoriesNeeded,
  defaultEquipmentSelections,
  describeOption,
  isEquipmentComplete,
  parseEquipmentChoices,
  resolveChosenEquipment,
  selectionFor,
} from "./equipmentChoices";

const ref = (index, name, count = 1, extra = {}) => ({
  option_type: "counted_reference",
  count,
  of: { index, name },
  ...extra,
});
const categoryChoice = (index, name, choose, desc) => ({
  option_type: "choice",
  choice: {
    desc,
    choose,
    from: {
      option_set_type: "equipment_category",
      equipment_category: { index, name },
    },
  },
});

// Cut down from the SRD's Fighter and Cleric starting equipment options.
const fighterRaw = {
  starting_equipment_options: [
    {
      choose: 1,
      from: {
        option_set_type: "options_array",
        options: [
          ref("chain-mail", "Chain Mail"),
          {
            option_type: "multiple",
            items: [
              ref("leather-armor", "Leather Armor"),
              ref("longbow", "Longbow"),
              ref("arrow", "Arrow", 20),
            ],
          },
        ],
      },
    },
    {
      choose: 1,
      from: {
        option_set_type: "options_array",
        options: [
          {
            option_type: "multiple",
            items: [
              categoryChoice(
                "martial-weapons",
                "Martial Weapons",
                1,
                "a martial weapon",
              ),
              ref("shield", "Shield"),
            ],
          },
          categoryChoice(
            "martial-weapons",
            "Martial Weapons",
            2,
            "two martial weapons",
          ),
        ],
      },
    },
  ],
};
const clericRaw = {
  starting_equipment_options: [
    {
      choose: 1,
      from: {
        option_set_type: "options_array",
        options: [
          ref("mace", "Mace"),
          ref("warhammer", "Warhammer", 1, {
            prerequisites: [
              {
                type: "proficiency",
                proficiency: { index: "warhammers", name: "Warhammers" },
              },
            ],
          }),
        ],
      },
    },
    {
      choose: 1,
      type: "equipment",
      from: {
        option_set_type: "equipment_category",
        equipment_category: { index: "holy-symbols", name: "Holy Symbols" },
      },
    },
  ],
};
const martialWeapons = [
  { index: "longsword", name: "Longsword" },
  { index: "battleaxe", name: "Battleaxe" },
];

describe("parseEquipmentChoices", () => {
  it("turns each SRD choice into a group of readable options", () => {
    const groups = parseEquipmentChoices(fighterRaw, "class");

    expect(groups.map((group) => group.options.map(describeOption))).toEqual([
      ["Chain Mail", "Leather Armor, Longbow and Arrow ×20"],
      ["a martial weapon and Shield", "two martial weapons"],
    ]);
    expect(groups[1].options[1].picks[0]).toMatchObject({
      count: 2,
      category: { index: "martial-weapons" },
    });
  });

  it("handles a straight pick from a category and an 'if proficient' option", () => {
    const groups = parseEquipmentChoices(clericRaw, "class");

    expect(groups[0].options[1].requires).toBe("Warhammers");
    expect(groups[1].options).toHaveLength(1);
    expect(describeOption(groups[1].options[0])).toBe("one from Holy Symbols");
  });

  it("returns nothing for a class or background without choices", () => {
    expect(parseEquipmentChoices({}, "background")).toEqual([]);
    expect(parseEquipmentChoices(null, "class")).toEqual([]);
  });

  it("lists every category any option needs", () => {
    expect(categoriesNeeded(parseEquipmentChoices(clericRaw, "class"))).toEqual(
      ["holy-symbols"],
    );
  });
});

describe("choosing starting gear", () => {
  const groups = parseEquipmentChoices(fighterRaw, "class");

  it("starts on the first option, with category picks still to make", () => {
    const selections = defaultEquipmentSelections(groups);

    expect(selections["class-0"].optionId).toBe("class-0-opt0");
    expect(isEquipmentComplete(groups, selections)).toBe(false);
  });

  it("is complete once every pick is filled in", () => {
    const selections = defaultEquipmentSelections(groups);
    const pickId = groups[1].options[0].picks[0].id;
    selections["class-1"].picks[pickId] = ["longsword"];

    expect(isEquipmentComplete(groups, selections)).toBe(true);
  });

  it("works out the chosen gear, merging repeated items", () => {
    const twoWeapons = groups[1].options[1];
    const selections = {
      "class-0": selectionFor(groups[0].options[1]),
      "class-1": {
        ...selectionFor(twoWeapons),
        picks: { [twoWeapons.picks[0].id]: ["longsword", "longsword"] },
      },
    };

    expect(
      resolveChosenEquipment(groups, selections, {
        "martial-weapons": martialWeapons,
      }),
    ).toEqual([
      { index: "leather-armor", name: "Leather Armor", quantity: 1 },
      { index: "longbow", name: "Longbow", quantity: 1 },
      { index: "arrow", name: "Arrow", quantity: 20 },
      { index: "longsword", name: "Longsword", quantity: 2 },
    ]);
  });
});

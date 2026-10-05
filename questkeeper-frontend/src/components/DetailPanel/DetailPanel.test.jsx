import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import DetailPanel from "./DetailPanel";

describe("DetailPanel: race", () => {
  const race = {
    name: "Tiefling",
    category: "Race",
    speed: 30,
    size: "Medium",
    sizeDescription: "About the same size as humans.",
    age: "Mature like humans.",
    alignment: "Often chaotic.",
    abilityBonuses: "INT +1, CHA +2",
    languages: "Common, Infernal",
    subraces: "",
    traits: [
      {
        name: "Infernal Legacy",
        description: "You know the thaumaturgy cantrip.",
      },
    ],
  };

  it("shows traits with their text, plus languages and age", () => {
    render(<DetailPanel selectedResult={race} />);

    expect(screen.getByText("Racial traits")).toBeInTheDocument();
    const item = screen.getByText("Infernal Legacy.").closest("li");
    expect(item).toHaveTextContent("You know the thaumaturgy cantrip.");
    expect(screen.getByText(/Common, Infernal/)).toBeInTheDocument();
    expect(screen.getByText(/Mature like humans/)).toBeInTheDocument();
  });

  it("leaves out sections the race does not have", () => {
    render(
      <DetailPanel selectedResult={{ ...race, traits: [], subraces: "" }} />,
    );

    expect(screen.queryByText("Racial traits")).not.toBeInTheDocument();
    expect(screen.queryByText("Subraces:")).not.toBeInTheDocument();
  });
});

describe("DetailPanel: class", () => {
  const paladin = {
    name: "Paladin",
    category: "Class",
    hitDie: "d10",
    savingThrows: "WIS, CHA",
    proficiencies: ["All armor"],
    skillChoiceLines: [
      "Choose any three",
      "Three musical instruments of your choice",
    ],
    startingEquipment: "Chain Mail x1",
    subclasses: "Devotion",
    spellcasting: "Casts with Charisma. Spellcasting starts at level 2.",
    levelOneFeatures: [{ name: "Lay on Hands", description: "Heal wounds." }],
    laterFeatures: "Divine Smite, Aura of Protection",
  };

  it("shows what you get at level 1, what comes later, and how it casts", () => {
    render(<DetailPanel selectedResult={paladin} />);

    expect(screen.getByText("At level 1 you get")).toBeInTheDocument();
    expect(screen.getByText("Lay on Hands.").closest("li")).toHaveTextContent(
      "Heal wounds.",
    );
    expect(
      screen.getByText(/Divine Smite, Aura of Protection/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Spellcasting starts at level 2/),
    ).toBeInTheDocument();
  });

  it("shows each skill choice on its own line", () => {
    render(<DetailPanel selectedResult={paladin} />);

    expect(screen.getByText("Choose any three")).toBeInTheDocument();
    expect(
      screen.getByText("Three musical instruments of your choice"),
    ).toBeInTheDocument();
  });
});

describe("DetailPanel: spell", () => {
  const spell = {
    name: "Confusion",
    category: "Spell",
    kind: "4th-level Enchantment",
    facts: [
      { label: "Casting Time", value: "1 action" },
      { label: "Components", value: "V, S, M (Three walnut shells.)" },
      { label: "Duration", value: "Concentration, up to 1 minute" },
    ],
    classes: "Bard, Druid, Sorcerer, Wizard",
    blocks: [
      "This spell assaults and twists creatures' minds.",
      { header: ["d10", "Behavior"], rows: [["1", "Moves randomly"]] },
    ],
  };

  it("shows the school and level, components, concentration, classes and the full text", () => {
    render(<DetailPanel selectedResult={spell} />);

    expect(screen.getByText("4th-level Enchantment")).toBeInTheDocument();
    expect(
      screen.getByText(/V, S, M \(Three walnut shells\.\)/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Concentration, up to 1 minute/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bard, Druid, Sorcerer, Wizard/),
    ).toBeInTheDocument();
    expect(screen.getByText(/assaults and twists/)).toBeInTheDocument();
  });

  it("draws tables in the spell text as real tables", () => {
    render(<DetailPanel selectedResult={spell} />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Behavior")).toBeInTheDocument();
    expect(within(table).getByText("Moves randomly")).toBeInTheDocument();
  });
});

describe("DetailPanel: beginner guidance", () => {
  it("shows a Good if you want line with the role and difficulty for a class", () => {
    render(
      <DetailPanel
        selectedResult={{
          name: "Fighter",
          category: "Class",
          hitDie: "d10",
          savingThrows: "STR, CON",
          proficiencies: [],
          startingEquipment: "",
          subclasses: "Champion",
          guidance: {
            goodIf:
              "to be great at fighting with the simplest rules in the game",
            role: "Weapon expert",
            difficulty: "Easy to play",
          },
        }}
      />,
    );

    expect(
      screen.getByText(/great at fighting with the simplest rules/),
    ).toBeInTheDocument();
    expect(screen.getByText("Weapon expert")).toBeInTheDocument();
    expect(screen.getByText("Easy to play")).toBeInTheDocument();
  });

  it("shows nothing extra when a race or class has no guidance", () => {
    render(
      <DetailPanel
        selectedResult={{
          name: "Homebrew",
          category: "Race",
          speed: 30,
          size: "Medium",
          abilityBonuses: "",
          alignment: "",
        }}
      />,
    );

    expect(screen.queryByText("Good if you want")).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterReview from "./CharacterReview";

function renderReview(props = {}) {
  const handlers = { onEdit: vi.fn(), onBack: vi.fn(), onCreate: vi.fn() };
  render(
    <CharacterReview
      name="Himmel"
      race={{ name: "Dragonborn", speed: 30 }}
      characterClass={{ name: "Cleric", hitDie: 8 }}
      subclass={{ name: "Life" }}
      background={{ name: "Acolyte" }}
      abilityScores={{
        strength: 17,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 9,
      }}
      skills={[
        { index: "insight", name: "Insight", from: "Acolyte" },
        { index: "medicine", name: "Medicine", from: "Cleric" },
      ]}
      cantrips={[
        { index: "sacred-flame", name: "Sacred Flame" },
        { index: "thaumaturgy", name: "Thaumaturgy", from: "from Tiefling" },
      ]}
      spells={[]}
      equipment={[
        { index: "shield", name: "Shield", quantity: 1 },
        { index: "javelin", name: "Javelin", quantity: 4 },
      ]}
      hitPoints={9}
      issues={[]}
      isCreating={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("CharacterReview", () => {
  it("introduces the character with their name, level, class and starting numbers", () => {
    renderReview();

    expect(screen.getByRole("heading", { name: "Himmel" })).toBeInTheDocument();
    expect(
      screen.getByText(/Level 1 Dragonborn Cleric \(Life\) · Acolyte/),
    ).toBeInTheDocument();
    const stats = screen.getByRole("list", { name: "Starting numbers" });
    expect(within(stats).getByText("d8")).toBeInTheDocument();
    expect(within(stats).getByText("9")).toBeInTheDocument();
    expect(within(stats).getByText("30 ft")).toBeInTheDocument();
  });

  it("shows each ability score with its modifier", () => {
    renderReview();

    const abilities = screen
      .getByRole("heading", { name: "Ability scores" })
      .closest("section");
    expect(within(abilities).getByText("17")).toBeInTheDocument();
    expect(within(abilities).getByText("+3")).toBeInTheDocument();
    expect(within(abilities).getByText("-1")).toBeInTheDocument();
  });

  it("lists skills with where each came from, magic, and gear with quantities", () => {
    renderReview();

    expect(screen.getByText("Insight").closest("li")).toHaveTextContent(
      "Acolyte",
    );
    expect(screen.getByText("Thaumaturgy").closest("li")).toHaveTextContent(
      "from Tiefling",
    );
    expect(screen.getByText("Javelin").closest("li")).toHaveTextContent("x4");
  });

  it("leaves the Magic card out for a character with no spells", () => {
    renderReview({ cantrips: [], spells: [] });

    expect(
      screen.queryByRole("heading", { name: "Magic" }),
    ).not.toBeInTheDocument();
  });

  it("sends you to the right step when you press a Change button", async () => {
    const { onEdit } = renderReview();

    await userEvent.click(screen.getByRole("button", { name: "Change race" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Change ability scores" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Change skills" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Change spells" }),
    );

    expect(onEdit.mock.calls.map(([step]) => step)).toEqual([
      "race",
      "abilities",
      "classSkills",
      "classSpells",
    ]);
  });

  it("lists what is missing, offers a fix, and holds back Create until it is done", async () => {
    const { onEdit, onCreate } = renderReview({
      issues: [{ step: "classSkills", message: "Choose 1 more skill" }],
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Choose 1 more skill");
    await userEvent.click(screen.getByRole("button", { name: "Fix this" }));
    expect(onEdit).toHaveBeenCalledWith("classSkills");

    const create = screen.getByRole("button", { name: "Create character" });
    expect(create).toBeDisabled();
    await userEvent.click(create);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("creates the character when everything is filled in", async () => {
    const { onCreate } = renderReview();

    await userEvent.click(
      screen.getByRole("button", { name: "Create character" }),
    );

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

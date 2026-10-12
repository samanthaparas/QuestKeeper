import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CharacterCreationPage from "./CharacterCreationPage";
import { loadQuizBuild } from "../../utils/quizBuild";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/characterStore", () => ({ saveCharacter: vi.fn() }));

// The real quiz builds and standard array, with the details loading mocked.
vi.mock("../../utils/quizBuild", async (importOriginal) => ({
  ...(await importOriginal()),
  loadQuizBuild: vi.fn(),
}));

const skill = (index, name) => ({ item: { index: `skill-${index}`, name: `Skill: ${name}` } });

const IRON_GUARDIAN = {
  raceRaw: {
    index: "dwarf",
    name: "Dwarf",
    speed: 25,
    ability_bonuses: [{ ability_score: { index: "con", name: "CON" }, bonus: 2 }],
    traits: [],
    subraces: [{ index: "hill-dwarf", name: "Hill Dwarf" }],
    languages: [],
  },
  subraceRaw: {
    index: "hill-dwarf",
    name: "Hill Dwarf",
    ability_bonuses: [{ ability_score: { index: "wis", name: "WIS" }, bonus: 1 }],
    racial_traits: [],
  },
  classRaw: {
    index: "fighter",
    name: "Fighter",
    hit_die: 10,
    saving_throws: [{ name: "STR" }, { name: "CON" }],
    proficiency_choices: [
      { choose: 2, desc: "Choose two", from: { options: [skill("athletics", "Athletics"), skill("perception", "Perception"), skill("survival", "Survival")] } },
    ],
    proficiencies: [],
    starting_equipment: [],
    starting_equipment_options: [],
    subclasses: [],
  },
  subclassRaw: null,
  backgroundRaw: {
    index: "toh_sentry",
    name: "Sentry",
    starting_proficiencies: [{ index: "skill-insight", name: "Skill: Insight" }],
    starting_equipment: [],
    starting_equipment_options: [],
  },
};

function renderFromQuiz(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/characters/new", state }]}>
      <Routes>
        <Route path="/characters/new" element={<CharacterCreationPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("character creation from the quiz", () => {
  it("fills in the build and skips ahead to what's left", async () => {
    loadQuizBuild.mockResolvedValue(IRON_GUARDIAN);
    renderFromQuiz({ quizBuild: "iron-guardian", name: "Bram" });

    expect(screen.getByRole("status")).toHaveTextContent("Filling in your build from the quiz");
    expect(await screen.findByText(/From the quiz: Iron Guardian/)).toBeInTheDocument();
    // Race, class and background are done; skills are the first thing left.
    expect(screen.getByRole("heading", { level: 2, name: /skills/i })).toBeInTheDocument();
    expect(loadQuizBuild).toHaveBeenCalledWith(expect.objectContaining({ id: "iron-guardian" }));
  });

  it("asks for a name first when the quiz didn't bring one", async () => {
    loadQuizBuild.mockResolvedValue(IRON_GUARDIAN);
    renderFromQuiz({ quizBuild: "iron-guardian" });
    expect(await screen.findByText(/From the quiz: Iron Guardian/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What's your character's name?" })).toBeInTheDocument();
    expect(screen.queryByText(/Take the character quiz/)).toBeNull();
  });

  it("says so if the build can't load, and carries on as usual", async () => {
    loadQuizBuild.mockRejectedValue(new Error("offline"));
    renderFromQuiz({ quizBuild: "iron-guardian", name: "Bram" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load that build");
  });

  it("offers the quiz on the name step", () => {
    renderFromQuiz(null);
    expect(screen.getByRole("button", { name: "Take the character quiz" })).toBeInTheDocument();
  });
});

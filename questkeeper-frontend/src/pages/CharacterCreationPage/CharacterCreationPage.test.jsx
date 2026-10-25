import { StrictMode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { installFakeStorage } from "../../test/fakeStorage";
import CharacterCreationPage from "./CharacterCreationPage";
import { loadQuizBuild } from "../../utils/quizBuild";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/characterStore", () => ({ saveCharacter: vi.fn() }));

// The real quiz builds and standard array, with the details loading mocked.
vi.mock("../../utils/quizBuild", async (importOriginal) => ({
  ...(await importOriginal()),
  loadQuizBuild: vi.fn(),
}));

// The character in progress is saved on the device; start every test clean.
beforeEach(() => installFakeStorage());

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
    // (The step is now part of the address, and the router updates it a
    // moment after the build fills in, so wait for it.)
    expect(await screen.findByRole("heading", { level: 2, name: /skills/i })).toBeInTheDocument();
    expect(loadQuizBuild).toHaveBeenCalledWith(expect.objectContaining({ id: "iron-guardian" }));
  });

  it("has one main heading on a later step, and moves keyboard focus to it on arrival", async () => {
    loadQuizBuild.mockResolvedValue(IRON_GUARDIAN);
    renderFromQuiz({ quizBuild: "iron-guardian", name: "Bram" });
    const heading = await screen.findByRole("heading", { level: 1, name: /skill proficiencies/i });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(heading).toHaveFocus();
  });

  it("asks for a name first when the quiz didn't bring one", async () => {
    loadQuizBuild.mockResolvedValue(IRON_GUARDIAN);
    renderFromQuiz({ quizBuild: "iron-guardian" });
    expect(await screen.findByText(/From the quiz: Iron Guardian/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What's your character's name?" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByText(/Take the character quiz/)).toBeNull();
  });

  it("says so if the build can't load, and carries on as usual", async () => {
    loadQuizBuild.mockRejectedValue(new Error("offline"));
    renderFromQuiz({ quizBuild: "iron-guardian", name: "Bram" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load that build");
  });

  it("says so, instead of loading forever, when the build no longer exists", async () => {
    loadQuizBuild.mockClear();
    renderFromQuiz({ quizBuild: "not-a-real-build" });
    expect(screen.getByRole("status")).toHaveTextContent("That quiz build isn't available any more");
    expect(screen.queryByText(/Filling in your build/)).toBeNull();
    expect(loadQuizBuild).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "take the quiz again" })).toHaveAttribute("href", "/quiz");
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText(/isn't available any more/)).toBeNull();
  });

  it("offers the quiz on the name step", () => {
    renderFromQuiz(null);
    expect(screen.getByRole("button", { name: "Take the character quiz" })).toBeInTheDocument();
  });
});

describe("moving between creation steps", () => {
  it("leaves keyboard focus on the name box on a first load, even under StrictMode", () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/characters/new"]}>
          <Routes>
            <Route path="/characters/new" element={<CharacterCreationPage />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
    expect(screen.getByPlaceholderText("Character name")).toHaveFocus();
  });

  it("keeps a new step's heading on screen when the rail and heading can't both fit", async () => {
    // jsdom has no layout, so pretend: a 360px-tall window, a heading 500px down the page,
    // and a scroll position that each scrollIntoView call moves.
    const savedScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
    const savedHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
    let scrolled = 0;
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 360 });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value() {
        if (this.classList.contains("character-creation__layout")) scrolled = 0;
        else if (this.tagName === "H1") scrolled = 500;
        else scrolled = 0; // anything else that scrolls the page up would undo the heading
      },
    });
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
      const top = (this.tagName === "H1" ? 500 : 0) - scrolled;
      return { top, bottom: top + 30, left: 0, right: 100, width: 100, height: 30, x: 0, y: top, toJSON() {} };
    });
    try {
      loadQuizBuild.mockResolvedValue(IRON_GUARDIAN);
      renderFromQuiz({ quizBuild: "iron-guardian", name: "Bram" });
      const heading = await screen.findByRole("heading", { level: 1, name: /skill proficiencies/i });
      expect(heading).toHaveFocus();
      expect(heading.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    } finally {
      rect.mockRestore();
      if (savedScroll) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", savedScroll);
      else delete HTMLElement.prototype.scrollIntoView;
      Object.defineProperty(window, "innerHeight", savedHeight);
    }
  });
});

describe("a character in progress survives Back and leaving", () => {
  function Probe() {
    const location = useLocation();
    const navigate = useNavigate();
    return (
      <>
        <p data-testid="where">{location.pathname + location.search}</p>
        <button type="button" onClick={() => navigate(-1)}>
          Browser back
        </button>
      </>
    );
  }

  function renderCreation(url = "/characters/new") {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <Probe />
        <Routes>
          <Route path="/characters/new" element={<CharacterCreationPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  async function nameAndContinue(name) {
    await userEvent.type(screen.getByPlaceholderText("Character name"), name);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
  }

  it("gives each step its own address, so Back goes to the previous step", async () => {
    renderCreation();
    await nameAndContinue("Bram");
    expect(screen.getByTestId("where")).toHaveTextContent("/characters/new?step=race");

    await userEvent.click(screen.getByRole("button", { name: "Browser back" }));
    expect(screen.getByPlaceholderText("Character name")).toHaveValue("Bram");
  });

  it("picks up where you left off after leaving the page", async () => {
    renderCreation();
    await nameAndContinue("Bram");
    cleanup();

    renderCreation();
    expect(screen.getByRole("status")).toHaveTextContent("Picking up where you left off with Bram");
    // The resumed step goes into the address, so Back still works after.
    expect(screen.getByTestId("where")).toHaveTextContent("/characters/new?step=race");
  });

  it("goes back to the first step after picking up a saved character", async () => {
    renderCreation();
    await nameAndContinue("Bram");
    cleanup();

    // Return through a plain link, then step back from the resumed step.
    render(
      <MemoryRouter initialEntries={["/characters", "/characters/new"]} initialIndex={1}>
        <Probe />
        <Routes>
          <Route path="/characters/new" element={<CharacterCreationPage />} />
          <Route path="/characters" element={<p>Your characters</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("where")).toHaveTextContent("/characters/new?step=race");
    await userEvent.click(screen.getByRole("button", { name: "Browser back" }));
    expect(screen.getByText("Your characters")).toBeInTheDocument();
  });

  it("starts over when you choose Start fresh", async () => {
    renderCreation();
    await nameAndContinue("Bram");
    cleanup();

    renderCreation("/characters/new?step=race");
    await userEvent.click(screen.getByRole("button", { name: "Start fresh" }));
    expect(screen.getByPlaceholderText("Character name")).toHaveValue("");
    expect(screen.queryByText(/Picking up where you left off/)).not.toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import QuizPage from "./QuizPage";
import BackLink from "../../components/BackLink/BackLink";
import { installFakeStorage } from "../../test/fakeStorage";

function Landed() {
  const location = useLocation();
  return <p data-testid="landed">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}

function renderQuiz(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/quiz", state }]}>
      <Routes>
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="*" element={<Landed />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // sessionStorage, the same way localStorage is faked.
  const store = new Map();
  const fake = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
  Object.defineProperty(window, "sessionStorage", { value: fake, configurable: true });
  installFakeStorage();
});

async function answerFirst(count) {
  for (let i = 0; i < count; i += 1) {
    await userEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
  }
}

describe("QuizPage", () => {
  it("asks questions one at a time and needs five answers before results", async () => {
    renderQuiz();
    await userEvent.click(screen.getByRole("button", { name: "Start the quiz" }));
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See my results" })).toBeDisabled();

    await answerFirst(4);
    expect(screen.getByText("Question 5 of 20")).toBeInTheDocument();
    expect(screen.getByText(/Answer at least 5 to see results \(4 so far\)/)).toBeInTheDocument();

    // A number key picks an answer too.
    await userEvent.keyboard("2");
    expect(screen.getByText("Question 6 of 20")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "See my results" }));

    const results = screen.getAllByRole("listitem").filter((item) => item.classList.contains("quiz__result"));
    expect(results).toHaveLength(3);
    expect(results[0]).toHaveTextContent("Best match");
    expect(within(results[0]).getByText("Also worth a look, from the books")).toBeInTheDocument();
  });

  it("lets questions be skipped and goes back", async () => {
    renderQuiz();
    await userEvent.click(screen.getByRole("button", { name: "Start the quiz" }));
    await userEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(screen.getByText("Question 2 of 20")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();
  });

  it("sends the chosen build, and the hero's name, to character creation", async () => {
    renderQuiz({ name: "Billie" });
    await userEvent.click(screen.getByRole("button", { name: "Start the quiz" }));
    await answerFirst(5);
    await userEvent.click(screen.getByRole("button", { name: "See my results" }));

    await userEvent.click(screen.getAllByRole("button", { name: /^Use this build: .+/ })[0]);
    const landed = screen.getByTestId("landed").textContent;
    expect(landed).toMatch(/^\/characters\/new /);
    expect(landed).toMatch(/"quizBuild":"[a-z-]+"/);
    expect(landed).toMatch(/"name":"Billie"/);
  });

  it("remembers answers if you leave and come back", async () => {
    const first = renderQuiz();
    await userEvent.click(screen.getByRole("button", { name: "Start the quiz" }));
    await answerFirst(3);
    first.unmount();

    renderQuiz();
    expect(screen.getByText("Question 4 of 20")).toBeInTheDocument();
  });

  it("comes back to the results from a book page, by its back button or the browser's", async () => {
    render(
      <MemoryRouter initialEntries={["/quiz"]}>
        <BackLink />
        <Routes>
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="*" element={<Landed />} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Start the quiz" }));
    await answerFirst(5);
    await userEvent.click(screen.getByRole("button", { name: "See my results" }));

    const firstBook = document.querySelector(".quiz__book-name");
    await userEvent.click(firstBook);
    expect(screen.getByTestId("landed")).toHaveTextContent(/^\/(races|backgrounds|classes) /);

    await userEvent.click(screen.getByRole("link", { name: "← Back to your quiz results" }));
    expect(screen.getByText("Three heroes that fit you")).toBeInTheDocument();
    // No back button on the quiz itself.
    expect(screen.queryByRole("link", { name: /Back to your quiz results/ })).toBeNull();
  });

  it("puts the page title in a banner on the intro and the results, with one main heading each", async () => {
    renderQuiz();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Find your character" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start the quiz" }));
    await answerFirst(5);
    await userEvent.click(screen.getByRole("button", { name: "See my results" }));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Three heroes that fit you" })).toBeInTheDocument();
  });
});

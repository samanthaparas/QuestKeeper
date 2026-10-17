import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FeatsPage from "./FeatsPage";

// Only the network is replaced (with the backend's feat lists, by edition):
// the real api.js and the real book feats are used.
vi.mock("../utils/homebrewCache", () => ({ loadHomebrew: vi.fn(async () => []) }));

function renderPage() {
  render(
    <MemoryRouter>
      <FeatsPage />
    </MemoryRouter>,
  );
}

function backendAnswers(answerFor) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
    const answer = answerFor(String(url));
    if (!answer) throw new Error("down");
    return { ok: true, json: async () => ({ data: answer }) };
  });
}

beforeEach(() => vi.restoreAllMocks());

describe("FeatsPage", () => {
  it("lists SRD and book feats together", async () => {
    backendAnswers((url) =>
      url.includes("edition=2024")
        ? [{ index: "alert", name: "Alert", edition: "2024", source: "SRD 5.2" }]
        : [{ index: "grappler", name: "Grappler", edition: "2014", source: "SRD 5.1" }],
    );
    renderPage();

    expect(await screen.findByText("Grappler")).toBeInTheDocument();
    expect(screen.getAllByText("Alert").length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Lucky")).length).toBeGreaterThan(0);
  });

  it("still shows the book feats when the SRD feats can't load", async () => {
    backendAnswers(() => null);
    renderPage();

    expect((await screen.findAllByText("Lucky")).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Unable to load feats/)).toBeNull();
  });

  it("opens a book feat with its summary and the link to the full rules", async () => {
    backendAnswers(() => []);
    renderPage();

    await userEvent.click((await screen.findAllByText("Lucky"))[0]);

    const link = await screen.findByRole("link", { name: "Read the full rules on Wikidot" });
    expect(link).toHaveAttribute("href", "https://dnd5e.wikidot.com/feat:lucky");
    expect(screen.getByRole("link", { name: "Make it as homebrew" })).toBeInTheDocument();
  });
});

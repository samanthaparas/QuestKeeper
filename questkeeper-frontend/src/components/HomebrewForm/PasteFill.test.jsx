import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomebrewForm from "./HomebrewForm";
import { emptyHomebrewForm } from "../../utils/homebrewForm";

// A made-up race, laid out like a rules page.
const PASTED = `Ability Score Increase. Your Wisdom score increases by 2.
Size. Your size is Small.
Speed. Your base walking speed is 25 feet.
Soft Step. Moss muffles your footsteps.`;

function renderForm(category = "race") {
  render(
    <MemoryRouter>
      <HomebrewForm
        initialForm={emptyHomebrewForm(category)}
        raceOptions={[]}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    </MemoryRouter>,
  );
}

async function pasteAndRead(text) {
  await userEvent.click(screen.getByText("Fill in from pasted text"));
  // fireEvent: typing a long text key by key is slow.
  fireEvent.change(screen.getByLabelText("Pasted rules"), { target: { value: text } });
  await userEvent.click(screen.getByRole("button", { name: "Read it" }));
}

describe("Fill in from pasted text", () => {
  it("fills in the ticked facts, leaving descriptions to the player", async () => {
    renderForm();
    await pasteAndRead(PASTED);

    // Untick Size, so it stays Medium.
    await userEvent.click(screen.getByRole("checkbox", { name: /Size: Small/ }));
    await userEvent.click(screen.getByRole("button", { name: "Fill in the ticked ones" }));

    expect(screen.getByLabelText("Walking speed (feet)")).toHaveValue(25);
    expect(screen.getByDisplayValue("Soft Step")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/your own words/);
  });

  it("keeps the pasted text beside the form, switchable with the preview", async () => {
    renderForm();
    await pasteAndRead(PASTED);

    const aside = screen.getByRole("complementary", { name: "Preview" });
    expect(within(aside).getByRole("region", { name: "Your pasted text" })).toHaveTextContent(
      "Moss muffles your footsteps.",
    );

    await userEvent.click(within(aside).getByRole("button", { name: "Preview" }));
    expect(within(aside).queryByRole("region", { name: "Your pasted text" })).toBeNull();
  });

  it("says when it can't find anything", async () => {
    renderForm("subclass");
    await pasteAndRead("Just some notes about my character.");

    expect(screen.getByRole("status")).toHaveTextContent(/Couldn't find any subclass rules/);
  });
});

describe("Summarize for my group", () => {
  it("puts Claude's short summary into the Summary box and empty descriptions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: "A quiet forest folk.",
        items: [{ name: "Soft Step", summary: "Hard to hear among trees." }],
        dropped: 0,
      }),
    });
    renderForm();
    await pasteAndRead(PASTED);
    await userEvent.click(screen.getByRole("button", { name: "Fill in the ticked ones" }));
    await userEvent.click(screen.getByRole("button", { name: "Summarize for my group" }));

    expect(await screen.findByDisplayValue("A quiet forest folk.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hard to hear among trees.")).toBeInTheDocument();
    expect(screen.getByText(/check them against the book/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("shows the server's message when summaries aren't available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Summaries aren't set up yet." }),
    });
    renderForm();
    await pasteAndRead(PASTED);
    await userEvent.click(screen.getByRole("button", { name: "Summarize for my group" }));

    expect(await screen.findByText("Summaries aren't set up yet.")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

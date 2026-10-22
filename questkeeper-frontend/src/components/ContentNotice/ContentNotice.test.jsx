import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentNotice from "./ContentNotice";

const SHEET = {
  name: "Pippa",
  race: { id: "tiefling", name: "Tiefling" },
  class: { name: "Ranger" },
  spellcasting: { spellsKnown: [{ name: "Hunter's Mark" }] },
};

describe("ContentNotice", () => {
  it("shows nothing when nothing is blocked", () => {
    const { container } = render(<ContentNotice banned={{}} sheet={SHEET} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists what isn't allowed, collapsed, with a count", async () => {
    render(<ContentNotice banned={{ race: ["Dhampir"], spell: ["Wish", "Simulacrum"] }} sheet={SHEET} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Not allowed at this table/));
    expect(screen.getByText("Dhampir")).toBeInTheDocument();
    expect(screen.queryByText(/Heads up/)).not.toBeInTheDocument();
  });

  it("gives a heads-up when the player's own character uses something on the list", () => {
    render(<ContentNotice banned={{ race: ["Tiefling"], spell: ["Wish"] }} sheet={SHEET} />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "Heads up: Pippa uses Tiefling (race), which your DM doesn't allow at this table. Have a word with your DM about it.",
    );
  });

  it("works before the character has loaded", () => {
    render(<ContentNotice banned={{ race: ["Tiefling"] }} sheet={null} />);
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});

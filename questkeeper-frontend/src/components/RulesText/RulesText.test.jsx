import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RulesText from "./RulesText";

describe("RulesText", () => {
  it("shows a word's meaning on tap, and hides it on Esc or a tap elsewhere", async () => {
    render(
      <div>
        <p>
          <RulesText text="You have advantage on the roll." />
        </p>
        <p>Somewhere else</p>
      </div>,
    );

    const word = screen.getByRole("button", { name: "advantage" });
    expect(word.closest("p")).toHaveTextContent("You have advantage on the roll.");

    await userEvent.click(word);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Roll two d20s and keep the higher one.");
    expect(word).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();

    await userEvent.click(word);
    await userEvent.click(screen.getByText("Somewhere else"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on keyboard focus and links to the full list", async () => {
    render(<RulesText text="The target is knocked prone." />);
    await userEvent.tab();

    const tip = await screen.findByRole("tooltip");
    expect(tip).toHaveTextContent("Prone");
    expect(screen.getByRole("link", { name: "All rules words" })).toHaveAttribute(
      "href",
      "#/guide?section=rules-words",
    );
  });

  it("renders plain text when there are no rules words", () => {
    const { container } = render(<RulesText text="A quiet afternoon." />);
    expect(container).toHaveTextContent("A quiet afternoon.");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

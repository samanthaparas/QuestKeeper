import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalcHint from "./CalcHint";

describe("CalcHint", () => {
  it("opens its explanation by keyboard or click, and Escape closes it back to the button", async () => {
    const user = userEvent.setup();
    render(<CalcHint label="How AC is worked out">Worked out from your equipped armor and Dexterity.</CalcHint>);
    const button = screen.getByRole("button", { name: "How AC is worked out" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/Worked out from your equipped armor/)).not.toBeVisible();

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("note")).toBeVisible();

    await user.keyboard("{Escape}");
    expect(screen.getByText(/Worked out from your equipped armor/)).not.toBeVisible();
    expect(button).toHaveFocus();

    await user.click(button);
    expect(screen.getByRole("note")).toBeVisible();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetTabs from "./CharacterSheetTabs";

describe("CharacterSheetTabs", () => {
  it("shows the Spells tab for spellcasters", () => {
    render(
      <CharacterSheetTabs
        activeTab="actions"
        onSelect={() => {}}
        hasSpellcasting
      />,
    );

    expect(screen.getByRole("tab", { name: "Spells" })).toBeInTheDocument();
  });

  it("hides the Spells tab for non-casters", () => {
    render(
      <CharacterSheetTabs
        activeTab="actions"
        onSelect={() => {}}
        hasSpellcasting={false}
      />,
    );

    expect(
      screen.queryByRole("tab", { name: "Spells" }),
    ).not.toBeInTheDocument();
  });

  it("marks only the active tab as selected", () => {
    render(
      <CharacterSheetTabs
        activeTab="inventory"
        onSelect={() => {}}
        hasSpellcasting={false}
      />,
    );

    expect(screen.getByRole("tab", { name: "Inventory" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Actions" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onSelect with the tab's key when a tab is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <CharacterSheetTabs
        activeTab="actions"
        onSelect={onSelect}
        hasSpellcasting={false}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Story" }));

    expect(onSelect).toHaveBeenCalledWith("story");
  });
});

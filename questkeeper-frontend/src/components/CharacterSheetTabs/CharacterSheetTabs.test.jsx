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

  it("shows the Journal tab only while the character is at a table", () => {
    const { rerender } = render(
      <CharacterSheetTabs activeTab="actions" onSelect={() => {}} hasSpellcasting={false} />,
    );
    expect(screen.queryByRole("tab", { name: "Journal & Handouts" })).not.toBeInTheDocument();

    rerender(
      <CharacterSheetTabs activeTab="actions" onSelect={() => {}} hasSpellcasting={false} hasTable />,
    );
    expect(screen.getByRole("tab", { name: "Journal & Handouts" })).toBeInTheDocument();
  });

  it("shows a count on a tab, and says what it means to screen readers", () => {
    render(<CharacterSheetTabs activeTab="actions" onSelect={() => {}} badges={{ features: 2 }} />);

    expect(screen.getByRole("tab", { name: /Features/ })).toHaveTextContent("2");
    expect(screen.getByRole("tab", { name: "Features (2 choices left)" })).toBeInTheDocument();
  });

  it("shows no count when there's nothing left to do", () => {
    render(<CharacterSheetTabs activeTab="actions" onSelect={() => {}} badges={{ features: 0 }} />);
    expect(screen.getByRole("tab", { name: "Features" })).toBeInTheDocument();
  });
});


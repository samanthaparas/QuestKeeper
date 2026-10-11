import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SourceFilter from "./SourceFilter";

const items = [
  { name: "Elf", source: "SRD 5.1" },
  { name: "Catfolk", source: "Tome of Heroes" },
  { name: "Drow", source: "Tome of Heroes" },
];

function renderFilter(props = {}) {
  const onChange = vi.fn();
  render(
    <MemoryRouter>
      <SourceFilter items={items} onChange={onChange} {...props} />
    </MemoryRouter>,
  );
  return onChange;
}

describe("SourceFilter", () => {
  it("shows All plus each source with counts", () => {
    renderFilter();
    expect(screen.getByRole("button", { name: "All (3)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "SRD 5.1 (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tome of Heroes (2)" })).toBeInTheDocument();
  });

  it("reports the picked source", async () => {
    const onChange = renderFilter();
    await userEvent.click(screen.getByRole("button", { name: "Tome of Heroes (2)" }));
    expect(onChange).toHaveBeenCalledWith("Tome of Heroes");
  });

  it("marks the current choice as pressed", () => {
    renderFilter({ value: "Tome of Heroes" });
    expect(screen.getByRole("button", { name: "Tome of Heroes (2)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All (3)" })).toHaveAttribute("aria-pressed", "false");
  });

  it("hides itself when everything is from one source", () => {
    renderFilter({ items: items.slice(1) });
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("stays visible while a source is picked, so All is always reachable", () => {
    renderFilter({ items: items.slice(1), value: "Tome of Heroes" });
    expect(screen.getByRole("button", { name: "All (2)" })).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Guide from "./Guide";

describe("Guide", () => {
  afterEach(() => {
    delete Element.prototype.scrollIntoView;
  });

  it("has a section on playing at a table", () => {
    render(
      <MemoryRouter>
        <Guide />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Playing at a QuestKeeper table" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "At the table" }),
    ).toBeInTheDocument();
  });

  it("scrolls to the section named in the link", () => {
    const scrolled = [];
    Element.prototype.scrollIntoView = vi.fn(function scrollIntoView() {
      scrolled.push(this.id);
    });

    render(
      <MemoryRouter initialEntries={["/guide?section=tables"]}>
        <Guide />
      </MemoryRouter>,
    );

    expect(scrolled).toEqual(["tables"]);
  });
});

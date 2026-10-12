import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BackLink from "./BackLink";

function renderAt(state) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/races", state }]}>
      <BackLink />
    </MemoryRouter>,
  );
}

describe("BackLink", () => {
  it("shows where the link said back is", () => {
    renderAt({ backTo: "/quiz?view=results", backLabel: "Back to your quiz results" });
    expect(screen.getByRole("link", { name: "← Back to your quiz results" })).toHaveAttribute(
      "href",
      "/quiz?view=results",
    );
  });

  it("shows nothing without one, or for somewhere off QuestKeeper", () => {
    renderAt(null);
    expect(screen.queryByRole("link")).toBeNull();
    renderAt({ backTo: "//evil.example" });
    expect(screen.queryByRole("link")).toBeNull();
  });
});

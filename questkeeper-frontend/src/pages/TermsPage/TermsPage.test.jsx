import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TermsPage from "./TermsPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <TermsPage />
    </MemoryRouter>,
  );
}

describe("TermsPage", () => {
  it("covers who can use it, what you put in, what isn't okay, and the limits", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Terms of use");
    for (const heading of [
      "The short version",
      "What you put in",
      "What isn't okay",
      "The AI features",
      "Cost",
      "No promises, and limits on what we owe you",
      "Ending things",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(/You must be at least 13/)).toBeInTheDocument();
  });

  it("says it is an independent fan project and credits the sources", () => {
    renderPage();
    expect(screen.getByText(/not made by, affiliated with, or endorsed by Wizards of the Coast/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "sources page" })).toHaveAttribute("href", "/attributions");
  });

  it("links to the privacy page and tells people they can delete their account", () => {
    renderPage();
    expect(screen.getAllByRole("link", { name: "privacy page" })[0]).toHaveAttribute("href", "/privacy");
    expect(screen.getAllByText(/delete your account/).length).toBeGreaterThan(0);
  });

  it("gives a way to report problems even with no contact email set", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "feedback link" })).toBeInTheDocument();
  });
});

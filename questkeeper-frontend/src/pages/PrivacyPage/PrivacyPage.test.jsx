import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrivacyPage from "./PrivacyPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );
}

describe("PrivacyPage", () => {
  it("says what is kept, who can see it, and who helps run it", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy");
    for (const heading of ["What we keep", "Who can see what", "Services that help us run it", "Cookies and tracking", "How long we keep it", "Your choices", "Children"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    // The helpers it names are the ones the app really uses.
    for (const name of ["Supabase", "Render", "Anthropic"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("no longer says fonts come from Google, because they are served from the site itself", () => {
    renderPage();
    expect(screen.queryByText("Google Fonts")).not.toBeInTheDocument();
  });

  it("tells people they can download their data and delete their account in Settings", () => {
    renderPage();
    expect(screen.getByText(/Download my data/)).toBeInTheDocument();
    expect(screen.getByText(/Delete my account/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("says private notes are never sent to the AI", () => {
    renderPage();
    expect(screen.getByText(/Private notes and character sheets are never sent/)).toBeInTheDocument();
  });

  it("gives a way to ask questions even with no contact email set", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "feedback link" })).toBeInTheDocument();
  });
});

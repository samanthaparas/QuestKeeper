import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PageBanner from "./PageBanner";
import About from "../../pages/About/About";
import AttributionsPage from "../../pages/AttributionsPage/AttributionsPage";
import Guide from "../../pages/Guide/Guide";

describe("PageBanner", () => {
  it("shows a real heading and description, with the picture as decoration only", () => {
    const { container } = render(
      <PageBanner art="library" eyebrow="Reference" title="Explore Races">
        <p className="page-banner__description">A short description.</p>
      </PageBanner>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Explore Races" })).toBeInTheDocument();
    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByText("A short description.")).toBeInTheDocument();
    const picture = container.querySelector("img");
    expect(picture).toHaveAttribute("alt", "");
    expect(picture.getAttribute("src")).toBeTruthy();
  });

  it("keeps the eyebrow out when there isn't one", () => {
    const { container } = render(<PageBanner art="hearth" title="About" />);
    expect(container.querySelector(".page-banner__eyebrow")).toBeNull();
  });
});

describe("pages that use the banner keep their intro text", () => {
  it("About, Attributions and Learn the Basics", () => {
    render(
      <MemoryRouter>
        <About />
        <AttributionsPage />
        <Guide />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "About QuestKeeper" })).toBeInTheDocument();
    expect(screen.getByText(/free companion for Dungeons/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Attributions" })).toBeInTheDocument();
    expect(screen.getByText(/freely licensed source/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Learn the Basics" })).toBeInTheDocument();
    expect(screen.getByText(/strange dice/)).toBeInTheDocument();
  });
});

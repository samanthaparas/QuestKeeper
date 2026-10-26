import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotFoundPage from "./NotFoundPage";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("has one clear heading, plain words, and a real way home", () => {
    renderAt("/nope/not-here");
    expect(screen.getByRole("heading", { level: 1, name: "We couldn't find that page" })).toBeInTheDocument();
    expect(screen.getByText("Check the address, or head back to your adventure.")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Start with the beginner guide" })).toHaveAttribute("href", "/guide");
  });

  it("keeps its picture decorative and names the page in the tab title", () => {
    const { container } = renderAt("/nope");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(document.title).toBe("Page Not Found · QuestKeeper");
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultCard from "./ResultCard";

describe("ResultCard", () => {
  it("shows a short tagline under the name when there is one", () => {
    render(
      <ResultCard
        result={{
          name: "Dragonborn",
          category: "Race",
          index: "dragonborn",
          tagline: "Dragon-blooded fire breather",
        }}
        onClick={() => {}}
      />,
    );

    expect(
      screen.getByText("Dragon-blooded fire breather"),
    ).toBeInTheDocument();
  });

  it("looks the same as before when there is no tagline", () => {
    render(
      <ResultCard
        result={{ name: "Acolyte", category: "Background", index: "acolyte" }}
        onClick={() => {}}
      />,
    );

    expect(screen.getByText("Acolyte")).toBeInTheDocument();
    expect(screen.queryByText(/fire breather/)).not.toBeInTheDocument();
  });
});

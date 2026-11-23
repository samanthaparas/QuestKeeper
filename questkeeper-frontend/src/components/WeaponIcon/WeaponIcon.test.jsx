import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import WeaponIcon from "./WeaponIcon";

describe("WeaponIcon", () => {
  it("draws the picture as decoration: hidden from screen readers and never focusable", () => {
    const { container } = render(<WeaponIcon iconId="longbow" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-icon", "longbow");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).not.toHaveAttribute("role");
    expect(svg).toHaveAttribute("width", "26");
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it("draws the plain picture for anything it doesn't have", () => {
    const { container } = render(<WeaponIcon iconId="not-a-weapon" size={24} />);
    expect(container.querySelector("svg")).toHaveAttribute("data-icon", "custom-weapon");
    expect(container.querySelector("svg")).toHaveAttribute("width", "24");
  });
});

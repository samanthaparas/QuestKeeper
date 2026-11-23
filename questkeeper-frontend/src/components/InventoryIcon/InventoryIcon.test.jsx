import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import InventoryIcon from "./InventoryIcon";

describe("InventoryIcon", () => {
  it("is decoration: hidden from screen readers and never focusable", () => {
    const { container } = render(<InventoryIcon name="worn" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-icon", "worn");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveAttribute("width", "20");
  });

  it("draws the Gear & tools picture for an unknown name", () => {
    const { container } = render(<InventoryIcon name="nope" />);
    expect(container.querySelector("svg")).toHaveAttribute("data-icon", "gear");
  });
});

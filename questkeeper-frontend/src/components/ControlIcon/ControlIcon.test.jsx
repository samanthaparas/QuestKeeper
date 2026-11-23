import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ControlIcon from "./ControlIcon";
import { controlIconShapes } from "./controlIconShapes";

describe("ControlIcon", () => {
  it("has the six control drawings and the four item actions", () => {
    expect(Object.keys(controlIconShapes).sort()).toEqual(
      ["attune", "delete", "edit", "equip-weapon", "favorite", "give", "help", "proficient", "split-stack", "wear-armor"],
    );
  });

  it("is decoration: hidden from screen readers and never focusable", () => {
    const { container } = render(<ControlIcon name="attune" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
    expect(svg).toHaveAttribute("data-icon", "attune");
  });

  it("fills the heart only when asked", () => {
    const { container, rerender } = render(<ControlIcon name="favorite" />);
    expect(container.querySelector("svg").style.getPropertyValue("--qk-icon-heart")).toBe("none");
    rerender(<ControlIcon name="favorite" filled />);
    expect(container.querySelector("svg").style.getPropertyValue("--qk-icon-heart")).toBe("currentColor");
  });

  it("draws nothing for a name it doesn't have", () => {
    const { container } = render(<ControlIcon name="nope" />);
    expect(container.querySelector("svg")).toBeNull();
  });
});

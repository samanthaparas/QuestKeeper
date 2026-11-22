import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CreationTips from "./CreationTips";
import { installFakeStorage } from "../../test/fakeStorage";

describe("CreationTips", () => {
  it("shows a title and each tip", () => {
    render(
      <CreationTips
        title="Picking skills"
        tips={["Perception comes up a lot.", "Skills can change later."]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Picking skills" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["Perception comes up a lot.", "Skills can change later."]);
  });

  it("shows a picture only when one has been added for the step", () => {
    const { container, rerender } = render(
      <CreationTips title="Tips" tips={["A tip."]} />,
    );
    expect(container.querySelector("img")).toBeNull();

    rerender(
      <CreationTips
        title="Tips"
        tips={["A tip."]}
        art="/creation-art/abilities.png"
      />,
    );
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/creation-art/abilities.png",
    );
  });

  it("steps aside when Beginner tips are off in Settings", () => {
    installFakeStorage();
    window.localStorage.setItem("qk-beginner-tips", "off");
    const { container } = render(<CreationTips title="Picking skills" tips={["Perception comes up a lot."]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

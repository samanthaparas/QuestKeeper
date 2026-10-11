import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SourceBadge from "./SourceBadge";

describe("SourceBadge", () => {
  it("shows the book name", () => {
    render(<SourceBadge source="Tome of Heroes" />);
    const badge = screen.getByText("Tome of Heroes");
    expect(badge).toHaveClass("source-badge");
    expect(badge).not.toHaveClass("source-badge--srd");
  });

  it("uses the quieter style for SRD entries", () => {
    render(<SourceBadge source="SRD 5.1" />);
    expect(screen.getByText("SRD 5.1")).toHaveClass("source-badge--srd");
  });

  it("renders nothing without a source", () => {
    const { container } = render(<SourceBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});

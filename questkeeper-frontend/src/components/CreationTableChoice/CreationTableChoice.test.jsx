import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreationTableChoice from "./CreationTableChoice";

const tables = [{ id: "t1", name: "Breakfast Club", banned: { race: ["Tiefling"] }, count: 1 }];

describe("CreationTableChoice", () => {
  it("lets the player say which table the character is for", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<CreationTableChoice tables={tables} value="" onChange={onChange} />);
    expect(screen.getByText(/Pick a table to hide/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Making this character for"), "t1");
    expect(onChange).toHaveBeenCalledWith("t1");

    rerender(<CreationTableChoice tables={tables} value="t1" onChange={onChange} />);
    expect(screen.getByText("Options Breakfast Club's DM doesn't allow are hidden below.")).toBeInTheDocument();
  });

  it("isn't shown when no table has rules", () => {
    const { container } = render(<CreationTableChoice tables={[]} value="" onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

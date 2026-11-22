import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GiftBox from "./GiftBox";

const incoming = { id: "g1", from_name: "Ann", item: { name: "Arrows", quantity: 3 } };
const outgoing = { id: "g2", to_name: "Bo", item: { name: "Rope", quantity: 1 } };

describe("GiftBox", () => {
  it("shows what's waiting, with Take it, Give back and Take it back", async () => {
    const onTake = vi.fn().mockResolvedValue();
    const onReturn = vi.fn().mockResolvedValue();
    const onCancel = vi.fn().mockResolvedValue();
    render(<GiftBox gifts={{ incoming: [incoming], outgoing: [outgoing] }} onTake={onTake} onReturn={onReturn} onCancel={onCancel} />);

    expect(screen.getByText(/gave you/)).toHaveTextContent("Ann gave you 3 Arrows.");
    expect(screen.getByText(/Waiting for/)).toHaveTextContent("Waiting for Bo to take Rope.");
    await userEvent.click(screen.getByRole("button", { name: "Take it" }));
    expect(onTake).toHaveBeenCalledWith(incoming);
    await userEvent.click(screen.getByRole("button", { name: "Give back" }));
    expect(onReturn).toHaveBeenCalledWith(incoming);
    await userEvent.click(screen.getByRole("button", { name: "Take it back" }));
    expect(onCancel).toHaveBeenCalledWith(outgoing);
  });

  it("says so when a button doesn't work", async () => {
    const onTake = vi.fn().mockRejectedValue(new Error("That gift is no longer waiting for you"));
    render(<GiftBox gifts={{ incoming: [incoming], outgoing: [] }} onTake={onTake} onReturn={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Take it" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That gift is no longer waiting for you");
  });

  it("shows nothing when the gift box is empty", () => {
    const { container } = render(<GiftBox gifts={{ incoming: [], outgoing: [] }} onTake={vi.fn()} onReturn={vi.fn()} onCancel={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

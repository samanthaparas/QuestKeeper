import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TableRules from "./TableRules";
import { installFakeStorage } from "../../test/fakeStorage";

describe("TableRules", () => {
  beforeEach(() => installFakeStorage());

  it("shows players nothing when the DM hasn't written any rules", () => {
    const { container } = render(<TableRules tableId="t1" rules="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows players one collapsed line, tagged New until they open it", async () => {
    const { unmount } = render(<TableRules tableId="t1" rules={"Phones down\nTell us early if you can't come"} />);
    expect(screen.getByText("New")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Table rules"));
    expect(screen.getByText("Phones down")).toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();
    unmount();

    // Still read, next visit: no tag.
    render(<TableRules tableId="t1" rules={"Phones down\nTell us early if you can't come"} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("tags it New again when the DM changes the rules", () => {
    window.localStorage.setItem("qk-rules-seen-t1", "Phones down");
    render(<TableRules tableId="t1" rules="Phones down and no spoilers" />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("lets the DM tap a starter line, edit, and save", async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<TableRules tableId="t1" rules="" isDm onSave={onSave} />);
    expect(screen.getByRole("button", { name: "Save table rules" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Plan your move while others take their turn/ }));
    expect(screen.getByRole("textbox", { name: "Table rules" })).toHaveValue("Plan your move while others take their turn.");
    // Added once: its button is used up.
    expect(screen.getByRole("button", { name: /Plan your move/ })).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox", { name: "Table rules" }), "\nBring snacks");
    await userEvent.click(screen.getByRole("button", { name: "Save table rules" }));

    expect(onSave).toHaveBeenCalledWith("Plan your move while others take their turn.\nBring snacks");
    expect(await screen.findByText(/Your players can read it now/)).toBeInTheDocument();
  });

  it("says so when saving fails", async () => {
    render(<TableRules tableId="t1" rules="" isDm onSave={vi.fn().mockRejectedValue(new Error("no"))} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Table rules" }), "Be kind");
    await userEvent.click(screen.getByRole("button", { name: "Save table rules" }));
    expect(await screen.findByText("Couldn't save that. Please try again.")).toBeInTheDocument();
  });
});

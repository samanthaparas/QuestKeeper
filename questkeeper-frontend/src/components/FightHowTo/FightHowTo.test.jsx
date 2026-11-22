import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FightHowTo from "./FightHowTo";
import { installFakeStorage } from "../../test/fakeStorage";

describe("How a fight works", () => {
  beforeEach(() => installFakeStorage());

  it("starts open for a new player, with the player's steps", () => {
    render(<FightHowTo side="player" />);
    expect(screen.getByText("New here?")).toBeInTheDocument();
    expect(screen.getByText(/tap Attack next to a weapon/)).toBeVisible();
    expect(screen.getByText(/Step away \(brb\)/)).toBeVisible();
  });

  it("folds away for good after Got it, and stays one tap away", async () => {
    const { unmount } = render(<FightHowTo side="player" />);
    await userEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.getByText(/tap Attack next to a weapon/)).not.toBeVisible();
    unmount();

    render(<FightHowTo side="player" />);
    expect(screen.queryByText("New here?")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Got it" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("How a fight works"));
    expect(screen.getByText(/tap Attack next to a weapon/)).toBeVisible();
  });

  it("has the DM's own steps, remembered separately", async () => {
    render(<FightHowTo side="dm" />);
    expect(screen.getByText(/Roll attack \+ damage/)).toBeVisible();
    expect(screen.getByText(/post a fight summary/)).toBeVisible();
    expect(screen.queryByText(/tap Attack next to a weapon/)).not.toBeInTheDocument();
  });

  it("steps aside when Beginner tips are off in Settings", () => {
    window.localStorage.setItem("qk-beginner-tips", "off");
    const { container } = render(<FightHowTo side="player" />);
    expect(container).toBeEmptyDOMElement();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SaveStatus from "./SaveStatus";

describe("SaveStatus", () => {
  it("says nothing when everything is saved", () => {
    const { container } = render(<SaveStatus status="saved" />);
    expect(container).toBeEmptyDOMElement();
    const { container: saving } = render(<SaveStatus status="saving" />);
    expect(saving).toBeEmptyDOMElement();
  });

  it("says changes are kept and will save, with a way to try now", async () => {
    const onRetry = vi.fn();
    render(<SaveStatus status="waiting" onRetry={onRetry} />);
    expect(screen.getByRole("status")).toHaveTextContent("Not saved yet. Your changes are kept on this device");
    await userEvent.click(screen.getByRole("button", { name: "Try now" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("says when it's the copy kept on this device, with a way to try the real one again", async () => {
    const onReload = vi.fn();
    render(<SaveStatus status="saved" isOfflineCopy onReload={onReload} />);
    expect(screen.getByRole("status")).toHaveTextContent("Can't reach QuestKeeper right now, so this is the copy saved on this device");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onReload).toHaveBeenCalled();
  });

  it("says when changes from last time were brought back", () => {
    render(<SaveStatus status="saving" recovered />);
    expect(screen.getByRole("status")).toHaveTextContent("Changes from last time hadn't saved. They're back, and saving now.");
  });

  it("says when the person is signed out", () => {
    render(<SaveStatus status="signed-out" />);
    expect(screen.getByRole("status")).toHaveTextContent("You're signed out, so changes can't save yet");
  });

  it("says a refused save isn't allowed, without blaming the connection or offering Try now", () => {
    render(<SaveStatus status="not-allowed" onRetry={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("only the player who owns this character can change it");
    expect(screen.getByRole("status")).not.toHaveTextContent(/connection/);
    expect(screen.queryByRole("button", { name: "Try now" })).not.toBeInTheDocument();
  });

  it("asks which version to keep when the sheet changed on another device", async () => {
    const onKeepMine = vi.fn();
    const onUseSaved = vi.fn();
    render(<SaveStatus conflict onKeepMine={onKeepMine} onUseSaved={onUseSaved} />);
    expect(screen.getByRole("alert")).toHaveTextContent("changed on another device while your edits were waiting");
    await userEvent.click(screen.getByRole("button", { name: "Keep my changes" }));
    await userEvent.click(screen.getByRole("button", { name: "Use the saved version" }));
    expect(onKeepMine).toHaveBeenCalled();
    expect(onUseSaved).toHaveBeenCalled();
  });
});

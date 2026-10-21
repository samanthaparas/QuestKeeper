import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import TurnHeadsUp from "./TurnHeadsUp";
import { setHeadsUpPreference } from "../../utils/turnHeadsUp";
import { installFakeStorage } from "../../test/fakeStorage";

function setHidden(hidden) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("TurnHeadsUp", () => {
  beforeEach(() => {
    installFakeStorage();
    document.title = "QuestKeeper";
    navigator.vibrate = vi.fn();
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  afterEach(() => {
    delete navigator.vibrate;
  });

  it("does nothing when it isn't close to this player's turn", () => {
    render(<TurnHeadsUp isMyTurn={false} isNext={false} />);
    expect(navigator.vibrate).not.toHaveBeenCalled();
    expect(document.title).toBe("QuestKeeper");
  });

  it("buzzes once when the player is next, and puts it in the title only while the tab is hidden", () => {
    render(<TurnHeadsUp isNext />);
    expect(navigator.vibrate).toHaveBeenCalledTimes(1);
    expect(document.title).toBe("QuestKeeper");

    setHidden(true);
    expect(document.title).toBe("🎲 You're up next · QuestKeeper");
    setHidden(false);
    expect(document.title).toBe("QuestKeeper");
  });

  it("buzzes twice-style for your turn, and puts the title back when it ends", () => {
    const { rerender, unmount } = render(<TurnHeadsUp isNext />);
    setHidden(true);
    rerender(<TurnHeadsUp isMyTurn />);
    expect(navigator.vibrate).toHaveBeenLastCalledWith([200, 100, 200]);
    expect(document.title).toBe("🎲 Your turn · QuestKeeper");

    unmount();
    expect(document.title).toBe("QuestKeeper");
  });

  it("stays quiet when the player turned it off, or the feature is switched off", () => {
    setHeadsUpPreference(false);
    render(<TurnHeadsUp isNext />);
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it("copes with a device that can't vibrate", () => {
    delete navigator.vibrate;
    expect(() => render(<TurnHeadsUp isMyTurn />)).not.toThrow();
  });
});

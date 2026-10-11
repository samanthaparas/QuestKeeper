import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomebrewDialog from "./HomebrewDialog";
import { createHomebrew } from "../../utils/homebrewStore";
import { refreshHomebrew } from "../../utils/homebrewCache";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/homebrewStore", () => ({ createHomebrew: vi.fn() }));
vi.mock("../../utils/homebrewCache", () => ({ refreshHomebrew: vi.fn() }));

// jsdom has no real <dialog> pop-up support, so stand in for it.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
  };
});

beforeEach(() => vi.clearAllMocks());

describe("HomebrewDialog", () => {
  it("saves a new entry, refreshes homebrew and reports it", async () => {
    createHomebrew.mockResolvedValue({ id: "b9", category: "background", name: "Ferry Pilot" });
    const onCreated = vi.fn();
    render(
      <HomebrewDialog request={{ category: "background" }} onClose={vi.fn()} onCreated={onCreated} />,
    );

    await userEvent.type(screen.getByLabelText("Name"), "Ferry Pilot");
    await userEvent.click(screen.getByRole("button", { name: "Save background" }));

    expect(createHomebrew).toHaveBeenCalledWith(
      expect.objectContaining({ category: "background", name: "Ferry Pilot" }),
    );
    expect(refreshHomebrew).toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "b9" }));
  });

  it("pre-fills a subrace's parent race", () => {
    render(
      <HomebrewDialog
        request={{
          category: "subrace",
          data: { parentRace: "elf", parentRaceName: "Elf" },
          raceOptions: [{ index: "elf", name: "Elf" }],
        }}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Which race is this a subrace of?")).toHaveValue("elf");
  });

  it("closes from its Cancel button", async () => {
    const onClose = vi.fn();
    render(<HomebrewDialog request={{ category: "race" }} onClose={onClose} onCreated={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});

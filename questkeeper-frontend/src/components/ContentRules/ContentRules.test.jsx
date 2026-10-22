import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContentRules from "./ContentRules";
import { getBackgrounds, getClasses, getFeatsToBrowse, getRaces, getSpells } from "../../utils/api";

vi.mock("../../utils/api", () => ({
  getRaces: vi.fn(),
  getClasses: vi.fn(),
  getBackgrounds: vi.fn(),
  getFeatsToBrowse: vi.fn(),
  getSpells: vi.fn(),
}));

describe("ContentRules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRaces.mockResolvedValue([{ name: "Tiefling" }, { name: "Dwarf" }, { name: "Tiefling" }]);
    getClasses.mockResolvedValue([{ name: "Wizard" }]);
    getBackgrounds.mockResolvedValue([{ name: "Noble" }]);
    getFeatsToBrowse.mockResolvedValue([{ name: "Lucky" }]);
    getSpells.mockResolvedValue([{ name: "Wish" }, { name: "Fireball" }]);
  });

  it("starts collapsed, says everything is allowed, and loads a list only when opened", async () => {
    render(<ContentRules banned={{}} onSave={vi.fn()} />);
    expect(getRaces).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText("Allowed content"));
    expect(screen.getByText("Nothing is blocked. Everything is allowed.")).toBeInTheDocument();
    expect(getRaces).toHaveBeenCalledTimes(1);
    // The list has no repeats, and each kind loads on its own.
    expect(getSpells).not.toHaveBeenCalled();
  });

  it("adds a race to the not-allowed list", async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<ContentRules banned={{}} onSave={onSave} />);
    await userEvent.click(screen.getByText("Allowed content"));

    await userEvent.type(screen.getByLabelText("Not allowed: add a race"), "Tiefling");
    await userEvent.click(screen.getByRole("button", { name: "Not allowed" }));
    expect(onSave).toHaveBeenCalledWith({ race: ["Tiefling"] });
  });

  it("switches kind, loads that list, and adds to it", async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<ContentRules banned={{ race: ["Tiefling"] }} onSave={onSave} />);
    await userEvent.click(screen.getByText(/Allowed content/));

    await userEvent.click(screen.getByRole("radio", { name: /Spells/ }));
    expect(getSpells).toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Not allowed: add a spell"), "Wish");
    await userEvent.click(screen.getByRole("button", { name: "Not allowed" }));
    expect(onSave).toHaveBeenCalledWith({ race: ["Tiefling"], spell: ["Wish"] });
  });

  it("lists what's blocked with a count, and lets an option be allowed again", async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(<ContentRules banned={{ race: ["Tiefling"], spell: ["Wish", "Simulacrum"] }} onSave={onSave} />);
    expect(screen.getByText("3 not allowed")).toBeInTheDocument();
    await userEvent.click(screen.getByText(/Allowed content/));

    const list = screen.getByRole("list", { name: "Not allowed at this table" });
    expect(list).toHaveTextContent("Races: Tiefling");
    expect(list).toHaveTextContent("Spells: Wish");

    await userEvent.click(screen.getByRole("button", { name: "Allow Wish again" }));
    expect(onSave).toHaveBeenCalledWith({ race: ["Tiefling"], spell: ["Simulacrum"] });
  });

  it("doesn't add the same thing twice, and says so", async () => {
    const onSave = vi.fn();
    render(<ContentRules banned={{ race: ["Tiefling"] }} onSave={onSave} />);
    await userEvent.click(screen.getByText(/Allowed content/));
    await userEvent.type(screen.getByLabelText("Not allowed: add a race"), "tiefling");
    await userEvent.click(screen.getByRole("button", { name: "Not allowed" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("tiefling is already on the list.")).toBeInTheDocument();
  });

  it("says so when saving fails, and still lets a name be typed when a list can't load", async () => {
    getRaces.mockRejectedValue(new Error("offline"));
    const onSave = vi.fn().mockRejectedValue(new Error("no"));
    render(<ContentRules banned={{}} onSave={onSave} />);
    await userEvent.click(screen.getByText("Allowed content"));
    expect(await screen.findByText("Couldn't load that list. You can still type a name.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Not allowed: add a race"), "Dhampir");
    await userEvent.click(screen.getByRole("button", { name: "Not allowed" }));
    expect(await screen.findByText("Couldn't save that. Please try again.")).toBeInTheDocument();
  });
});

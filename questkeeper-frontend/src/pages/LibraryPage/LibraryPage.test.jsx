import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LibraryPage from "./LibraryPage";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/tableStore", () => ({
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  listTemplates: vi.fn(),
  updateTemplate: vi.fn(),
}));

const bugbear = {
  id: "tpl-1",
  name: "Bugbear",
  kind: "monster",
  max_hp: 27,
  armor_class: 16,
  stat_block: { attacks: [{ name: "Morningstar", toHit: 4, damage: "2d8+2" }], notes: "" },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplates.mockResolvedValue([bugbear]);
  });

  it("lists the saved monsters with their numbers and attacks", async () => {
    renderPage();

    const item = (await screen.findByText("Bugbear")).closest("li");
    expect(item).toHaveTextContent("27 HP · AC 16 · Morningstar");
  });

  it("explains an empty library", async () => {
    listTemplates.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/Nothing here yet/)).toBeInTheDocument();
  });

  it("adds a monster with a stat block", async () => {
    createTemplate.mockResolvedValue({ id: "tpl-2", name: "Ogre", kind: "monster", max_hp: 59, armor_class: 11, stat_block: {} });
    renderPage();
    await screen.findByText("Bugbear");

    await userEvent.type(screen.getByLabelText("Name"), "Ogre");
    await userEvent.type(screen.getByLabelText("HP"), "59");
    await userEvent.type(screen.getByLabelText("AC"), "11");
    await userEvent.click(screen.getByRole("button", { name: "+ Add attack" }));
    await userEvent.type(screen.getByLabelText("Attack 1 name"), "Greatclub");
    await userEvent.type(screen.getByLabelText("Attack 1 to hit"), "6");
    await userEvent.type(screen.getByLabelText("Attack 1 damage"), "2d8+4");
    await userEvent.click(screen.getByRole("button", { name: "Add to library" }));

    expect(createTemplate).toHaveBeenCalledWith({
      name: "Ogre",
      kind: "monster",
      maxHp: 59,
      armorClass: 11,
      statBlock: { attacks: [{ name: "Greatclub", toHit: 6, damage: "2d8+4" }], notes: "" },
    });
    expect(await screen.findByText("Ogre")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("saves a friendly NPC", async () => {
    createTemplate.mockResolvedValue({ id: "t3", name: "Sir Pip", kind: "ally", max_hp: 20, armor_class: null, stat_block: {} });
    renderPage();
    await screen.findByText("Bugbear");

    await userEvent.click(screen.getByLabelText("Friendly NPC"));
    await userEvent.type(screen.getByLabelText("Name"), "Sir Pip");
    await userEvent.type(screen.getByLabelText("HP"), "20");
    await userEvent.click(screen.getByRole("button", { name: "Add to library" }));

    expect(createTemplate).toHaveBeenCalledWith(expect.objectContaining({ kind: "ally", armorClass: null }));
  });

  it("will not save without a name or valid HP", async () => {
    renderPage();
    await screen.findByText("Bugbear");

    await userEvent.click(screen.getByRole("button", { name: "Add to library" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/name/i);

    await userEvent.type(screen.getByLabelText("Name"), "Rat");
    await userEvent.click(screen.getByRole("button", { name: "Add to library" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/HP/);
    expect(createTemplate).not.toHaveBeenCalled();
  });

  it("edits an existing entry", async () => {
    updateTemplate.mockResolvedValue({ ...bugbear, max_hp: 30 });
    renderPage();
    const item = (await screen.findByText("Bugbear")).closest("li");

    await userEvent.click(within(item).getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Bugbear");
    expect(screen.getByLabelText("Attack 1 name")).toHaveValue("Morningstar");

    await userEvent.clear(screen.getByLabelText("HP"));
    await userEvent.type(screen.getByLabelText("HP"), "30");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateTemplate).toHaveBeenCalledWith("tpl-1", expect.objectContaining({ maxHp: 30, armorClass: 16 }));
    expect(await screen.findByText(/30 HP/)).toBeInTheDocument();
  });

  it("deletes only after confirmation", async () => {
    deleteTemplate.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderPage();
    const item = (await screen.findByText("Bugbear")).closest("li");

    await userEvent.click(within(item).getByRole("button", { name: "Delete" }));
    expect(deleteTemplate).not.toHaveBeenCalled();

    await userEvent.click(within(item).getByRole("button", { name: "Delete" }));
    expect(deleteTemplate).toHaveBeenCalledWith("tpl-1");
    expect(screen.queryByText("Bugbear")).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it("shows an error if the library cannot load", async () => {
    listTemplates.mockRejectedValue(new Error("Could not reach the database"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the database");
  });

  it("won't add a second copy of something already in the library", async () => {
    renderPage();
    await screen.findByText("Bugbear");

    await userEvent.type(screen.getByLabelText("Name"), "Bugbear");
    await userEvent.type(screen.getByLabelText("HP"), "27");
    await userEvent.type(screen.getByLabelText("AC"), "16");
    await userEvent.click(screen.getByRole("button", { name: "+ Add attack" }));
    await userEvent.type(screen.getByLabelText("Attack 1 name"), "Morningstar");
    await userEvent.type(screen.getByLabelText("Attack 1 to hit"), "4");
    await userEvent.type(screen.getByLabelText("Attack 1 damage"), "2d8+2");
    await userEvent.click(screen.getByRole("button", { name: "Add to library" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("already in your library");
    expect(createTemplate).not.toHaveBeenCalled();
  });
});

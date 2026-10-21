import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EncounterHelper from "./EncounterHelper";
import { getMonsterDetails, getMonsters } from "../../utils/api";

vi.mock("../../utils/api", () => ({
  getMonsters: vi.fn(),
  getMonsterDetails: vi.fn(),
}));

const MONSTERS = [
  { index: "goblin", name: "Goblin", challengeRating: 0.25, xp: 50, type: "humanoid", size: "Small", hitPoints: 7 },
  { index: "ogre", name: "Ogre", challengeRating: 2, xp: 450, type: "giant", size: "Large", hitPoints: 59 },
  { index: "zombie", name: "Zombie", challengeRating: 0.25, xp: 50, type: "undead", size: "Medium", hitPoints: 22 },
];

const GOBLIN_DETAIL = {
  name: "Goblin",
  size: "Small",
  type: "humanoid",
  challenge_rating: 0.25,
  hit_points: 7,
  dexterity: 14,
  armor_class: [{ value: 15 }],
  actions: [{ name: "Scimitar", attack_bonus: 4, damage: [{ damage_dice: "1d6+2" }] }],
};

// The line saying how hard the mix is (there is also a separate message line).
const rating = () => document.querySelector(".encounter-helper__rating");

async function open() {
  await userEvent.click(screen.getByText("Encounter helper"));
  await waitFor(() => expect(getMonsters).toHaveBeenCalled());
  await screen.findByRole("button", { name: "Suggest an encounter" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Suggest an encounter" })).toBeEnabled());
}

describe("EncounterHelper", () => {
  beforeEach(() => {
    getMonsters.mockReset().mockResolvedValue(MONSTERS);
    getMonsterDetails.mockReset().mockResolvedValue(GOBLIN_DETAIL);
  });

  it("loads the monster list only when opened", async () => {
    render(<EncounterHelper levels={[3, 3, 3, 3]} onAdd={vi.fn()} />);
    expect(getMonsters).not.toHaveBeenCalled();
    await open();
    expect(getMonsters).toHaveBeenCalledTimes(1);
  });

  it("says who the party is, and lets the DM change it", async () => {
    render(<EncounterHelper levels={[3, 3, 4, 2]} onAdd={vi.fn()} />);
    expect(screen.getByText("Party: 4 players (levels 3, 3, 4, 2)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Different party?" }));
    expect(screen.getByLabelText("Players")).toHaveValue(4);
    expect(screen.getByLabelText("Level")).toHaveValue(3);
  });

  it("asks for a party size and level when the table has no players yet", () => {
    render(<EncounterHelper levels={[]} onAdd={vi.fn()} />);
    expect(screen.getByLabelText("Players")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use my table's players" })).not.toBeInTheDocument();
  });

  it("suggests an encounter and says how hard it is, then lets you add another idea", async () => {
    render(<EncounterHelper levels={[3, 3, 3, 3]} onAdd={vi.fn()} />);
    await open();

    await userEvent.click(screen.getByRole("radio", { name: "Hard" }));
    await userEvent.click(screen.getByRole("button", { name: "Suggest an encounter" }));

    expect(screen.getByRole("list", { name: "This encounter" })).toBeInTheDocument();
    expect(rating()).toHaveTextContent("Hard for this party");
    expect(screen.getByRole("button", { name: "Another idea" })).toBeInTheDocument();
  });

  it("sticks to a theme", async () => {
    render(<EncounterHelper levels={[3, 3, 3, 3]} onAdd={vi.fn()} />);
    await open();

    await userEvent.selectOptions(screen.getByLabelText("Theme"), "undead");
    await userEvent.click(screen.getByRole("radio", { name: "Easy" }));
    await userEvent.click(screen.getByRole("button", { name: "Suggest an encounter" }));

    const list = screen.getByRole("list", { name: "This encounter" });
    expect(list).toHaveTextContent("Zombie");
    expect(list).not.toHaveTextContent("Goblin");
  });

  it("lets the DM search, add, and change counts, with the rating following", async () => {
    render(<EncounterHelper levels={[3, 3, 3, 3]} onAdd={vi.fn()} />);
    await open();

    await userEvent.type(screen.getByLabelText("Add a monster"), "ogr");
    await userEvent.click(screen.getByRole("button", { name: /Ogre/ }));
    // One ogre (450 XP) is Easy for four 3rd-level characters.
    expect(rating()).toHaveTextContent("Easy for this party");

    await userEvent.click(screen.getByRole("button", { name: "One more Ogre" }));
    await userEvent.click(screen.getByRole("button", { name: "One more Ogre" }));
    expect(rating()).toHaveTextContent("Deadly for this party");

    await userEvent.click(screen.getByRole("button", { name: "One fewer Ogre" }));
    await userEvent.click(screen.getByRole("button", { name: "One fewer Ogre" }));
    await userEvent.click(screen.getByRole("button", { name: "One fewer Ogre" }));
    expect(screen.queryByRole("list", { name: "This encounter" })).not.toBeInTheDocument();
  });

  it("adds the encounter to the fight with each monster's stat block, then clears it", async () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    render(<EncounterHelper levels={[3, 3, 3, 3]} onAdd={onAdd} />);
    await open();

    await userEvent.type(screen.getByLabelText("Add a monster"), "gob");
    await userEvent.click(screen.getByRole("button", { name: /Goblin/ }));
    await userEvent.click(screen.getByRole("button", { name: "One more Goblin" }));
    await userEvent.click(screen.getByRole("button", { name: "Add this encounter" }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(getMonsterDetails).toHaveBeenCalledWith("goblin");
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Goblin",
        count: 2,
        maxHp: 7,
        armorClass: 15,
        kind: "monster",
        initiative: null,
        statBlock: expect.objectContaining({ attacks: [{ name: "Scimitar", toHit: 4, damage: "1d6+2" }] }),
      }),
    );
    expect(await screen.findByText(/Added 2 Goblin/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "This encounter" })).not.toBeInTheDocument();
  });

  it("says so when adding fails, and keeps the encounter", async () => {
    render(<EncounterHelper levels={[3, 3, 3, 3]} onAdd={vi.fn().mockResolvedValue(false)} />);
    await open();
    await userEvent.type(screen.getByLabelText("Add a monster"), "gob");
    await userEvent.click(screen.getByRole("button", { name: /Goblin/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add this encounter" }));

    expect(await screen.findByText(/Couldn.t add all of them/)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "This encounter" })).toBeInTheDocument();
  });

  it("says so when the monster list can't load", async () => {
    getMonsters.mockRejectedValue(new Error("offline"));
    render(<EncounterHelper levels={[3, 3, 3, 3]} onAdd={vi.fn()} />);
    await userEvent.click(screen.getByText("Encounter helper"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the monster list");
  });
});

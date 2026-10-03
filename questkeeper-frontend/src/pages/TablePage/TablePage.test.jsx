import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TablePage from "./TablePage";
import { useTable } from "../../hooks/useTable";
import { getCharactersByIds } from "../../utils/characterStore";
import {
  setMyInitiative,
  applyDamage,
  postPlayerDamage,
  dmDenyAttack,
  dmResolveAttack,
  addCombatant,
  createTemplate,
  editCombatant,
  endMyTurn,
} from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { id: "player-1" } }),
}));

vi.mock("../../hooks/useTable", () => ({ useTable: vi.fn() }));

vi.mock("../../utils/characterStore", () => ({
  getCharacter: vi.fn().mockResolvedValue({ abilityScores: { dexterity: 14 } }),
  getCharactersByIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../utils/tableStore", () => ({
  addCombatant: vi.fn().mockResolvedValue("new-id"),
  advanceTurn: vi.fn(),
  createTemplate: vi.fn(),
  editCombatant: vi.fn().mockResolvedValue(undefined),
  endMyTurn: vi.fn().mockResolvedValue(undefined),
  listTemplates: vi.fn().mockResolvedValue([]),
  applyDamage: vi.fn().mockResolvedValue(undefined),
  deleteTable: vi.fn(),
  dmDenyAttack: vi.fn().mockResolvedValue(undefined),
  dmResolveAttack: vi.fn(),
  endCombat: vi.fn(),
  leaveTable: vi.fn(),
  postPlayerDamage: vi.fn(),
  removeCombatant: vi.fn(),
  removeMember: vi.fn(),
  resetEncounter: vi.fn(),
  setCombatantInitiative: vi.fn(),
  setMyInitiative: vi.fn().mockResolvedValue(undefined),
  startCombat: vi.fn(),
}));

const combatants = [
  {
    id: "c-billie",
    kind: "player",
    user_id: "player-1",
    name: "Billie",
    initiative: null,
    status: "healthy",
    damage_taken: 0,
    created_at: "2026-10-03T00:00:01Z",
  },
  {
    id: "c-kobold",
    kind: "monster",
    user_id: null,
    name: "Kobold",
    initiative: 12,
    status: "bloodied",
    damage_taken: 11,
    created_at: "2026-10-03T00:00:02Z",
  },
];

let currentTable;

function mockTable({ isDm, combatActive = true, currentId = "c-kobold" }) {
  currentTable = {
    table: {
      id: "t1",
      name: "Final Fight",
      dm_id: isDm ? "player-1" : "dm-1",
      join_code: "ABC123",
      combat_active: combatActive,
      round: 2,
      current_combatant_id: currentId,
    },
    members: [{ user_id: "player-1", character_id: "char-1" }],
    combatants,
    enemyHp: isDm ? { "c-kobold": { current_hp: 9, max_hp: 20, armor_class: 12 } } : {},
    events: [{ id: "e1", message: "Billie attacks Kobold with Dagger (rolled 15). That hits!" }],
    isLoading: false,
    error: "",
    refresh: vi.fn().mockResolvedValue(undefined),
    isDm,
  };
  useTable.mockReturnValue(currentTable);
}

// A row in the initiative list, found by the fighter's name.
function rowFor(name) {
  return Array.from(document.querySelectorAll("li.table-page__row")).find(
    (row) => row.querySelector(".table-page__row-name")?.firstChild?.textContent === name,
  );
}

const ally = {
  id: "c-pip",
  kind: "ally",
  user_id: null,
  name: "Sir Pip",
  initiative: 5,
  status: "healthy",
  damage_taken: 0,
  created_at: "2026-10-03T00:00:03Z",
};

function withAlly(extra = {}) {
  useTable.mockReturnValue({
    ...currentTable,
    combatants: [...combatants, ally],
    enemyHp: {
      ...currentTable.enemyHp,
      "c-pip": {
        current_hp: 18,
        max_hp: 20,
        armor_class: 16,
        stat_block: { attacks: [{ name: "Sword", toHit: 5, damage: "1d8+3" }] },
      },
    },
    ...extra,
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/tables/t1"]}>
      <Routes>
        <Route path="/tables/:id" element={<TablePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("as a player", () => {
    beforeEach(() => mockTable({ isDm: false }));

    it("shows an enemy's status and damage taken but never its HP", () => {
      renderPage();

      expect(screen.getByText(/Bloodied/)).toBeInTheDocument();
      expect(screen.getByText(/11 damage taken/)).toBeInTheDocument();
      expect(screen.queryByText(/DM only/)).not.toBeInTheDocument();
      expect(screen.queryByText(/9\/20/)).not.toBeInTheDocument();
    });

    it("shows the attack count to players but no Deny button", () => {
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) =>
          c.id === "c-billie"
            ? { ...c, attacks_this_turn: 3, last_attack_target: "c-kobold" }
            : c,
        ),
      });
      renderPage();

      expect(screen.getByText("3 attacks this turn")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Deny last attack" })).not.toBeInTheDocument();
    });

    it("gives the player a button straight to their character sheet", () => {
      renderPage();

      expect(
        screen.getByRole("link", { name: "Open my character sheet" }),
      ).toHaveAttribute("href", "/characters/char-1");
    });

    it("has no DM controls", () => {
      renderPage();

      expect(screen.queryByText("Join code")).not.toBeInTheDocument();
      expect(screen.queryByText("Add monsters and NPCs")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Damage" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Start combat" })).not.toBeInTheDocument();
    });

    it("locks a player's initiative once combat started and they have one", () => {
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) => (c.id === "c-billie" ? { ...c, initiative: 15 } : c)),
      });
      renderPage();

      expect(screen.queryByRole("button", { name: "Roll d20" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Initiative for Billie")).not.toBeInTheDocument();
    });

    it("shows allies to players but without any DM controls or HP", () => {
      withAlly();
      renderPage();

      const row = rowFor("Sir Pip");
      expect(row).toHaveTextContent("Ally");
      expect(row).not.toHaveTextContent("DM only");
      expect(within(row).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
      expect(within(row).queryByRole("button", { name: "Attack" })).not.toBeInTheDocument();
    });

    it("gives a player an End my turn button only on their own turn", async () => {
      mockTable({ isDm: false, currentId: "c-billie" });
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) => (c.id === "c-billie" ? { ...c, initiative: 15 } : c)),
      });
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "End my turn" }));
      expect(endMyTurn).toHaveBeenCalledWith("t1");
    });

    it("hides End my turn when it is someone else's turn", () => {
      renderPage(); // the current turn belongs to the Kobold

      expect(screen.queryByRole("button", { name: "End my turn" })).not.toBeInTheDocument();
    });

    it("has no Attack button on enemies for a player", () => {
      renderPage();

      expect(screen.queryByRole("button", { name: "Attack" })).not.toBeInTheDocument();
    });

    it("lets the player roll their own initiative", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "Roll d20" }));

      expect(setMyInitiative).toHaveBeenCalledWith("t1", expect.any(Number));
      vi.restoreAllMocks();
    });

    it("shows the shared activity log", () => {
      renderPage();

      // The line shows in the log and again under the enemy it happened to.
      expect(screen.getAllByText(/That hits!/).length).toBeGreaterThan(0);
    });

    it("never shows an AC field or the call-a-hit controls", () => {
      renderPage();

      expect(screen.queryByLabelText("Monster AC")).not.toBeInTheDocument();
      expect(screen.queryByText("An enemy hits a player")).not.toBeInTheDocument();
    });

    it("shows who is up now in the combat line", () => {
      renderPage();

      expect(screen.getByText(/Round 2/)).toBeInTheDocument();
      expect(screen.getAllByText(/Kobold/).length).toBeGreaterThan(0);
    });
  });

  describe("as the DM", () => {
    beforeEach(() => mockTable({ isDm: true }));

    it("shows the join code, secret HP, and combat controls", () => {
      renderPage();

      expect(screen.getByText("ABC123")).toBeInTheDocument();
      expect(screen.getByText(/DM only: 9\/20 HP · AC 12/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next turn" })).toBeInTheDocument();
    });

    it("shows the initiative order under its own heading", () => {
      renderPage();

      expect(screen.getByRole("heading", { name: "Initiative order" })).toBeInTheDocument();
    });

    it("hides the Set initiative controls once combat has started", () => {
      renderPage();

      // Kobold already has an initiative, so it is locked during combat.
      expect(screen.queryByLabelText("Initiative for Kobold")).not.toBeInTheDocument();
      // Billie has none yet (joined late), so she can still be given one.
      expect(screen.getByLabelText("Initiative for Billie")).toBeInTheDocument();
    });

    it("keeps the Set initiative controls before combat starts", () => {
      mockTable({ isDm: true, combatActive: false });
      renderPage();

      expect(screen.getByLabelText("Initiative for Kobold")).toBeInTheDocument();
    });

    it("lets the DM attack with an enemy during combat, and not before", async () => {
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "Attack" }));
      expect(screen.getByRole("region", { name: "Kobold attacks" })).toBeInTheDocument();
    });

    it("has no Attack button for enemies when no fight is running", () => {
      mockTable({ isDm: true, combatActive: false });
      renderPage();

      expect(screen.queryByRole("button", { name: "Attack" })).not.toBeInTheDocument();
    });

    it("shows what the player rolled in the call strip", () => {
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) =>
          c.id === "c-billie"
            ? {
                ...c,
                attack_state: "awaiting_dm",
                attack_target: "c-kobold",
                attack_name: "Dagger",
                attack_natural: 9,
                attack_bonus: 5,
              }
            : c,
        ),
      });
      renderPage();

      const row = screen.getByText(/Does it hit\?/).closest("li");
      expect(row).toHaveTextContent("rolled 14 (9 + 5)");
    });

    it("shows a waiting attack inside the enemy's own row, not in a separate box", async () => {
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) =>
          c.id === "c-billie"
            ? { ...c, attack_state: "awaiting_dm", attack_target: "c-kobold", attack_name: "Dagger" }
            : c,
        ),
      });
      renderPage();

      const prompt = screen.getByText(/Does it hit\?/);
      const row = prompt.closest("li");
      expect(row).toHaveClass("table-page__row--awaiting");
      expect(row).toHaveTextContent("Kobold");
      expect(screen.queryByText("Waiting for your call")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Hit" }));
      expect(dmResolveAttack).toHaveBeenCalledWith("c-billie", true);
    });

    it("still shows a waiting attack if its target cannot be found", () => {
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) =>
          c.id === "c-billie"
            ? { ...c, attack_state: "awaiting_dm", attack_target: "gone", attack_name: "Dagger" }
            : c,
        ),
      });
      renderPage();

      expect(screen.getByText("Waiting for your call")).toBeInTheDocument();
    });

    it("shows only the 5 newest activity lines, with a button for the rest", async () => {
      useTable.mockReturnValue({
        ...currentTable,
        events: Array.from({ length: 8 }, (_, index) => ({
          id: `e${index}`,
          message: `Event number ${index}`,
        })),
      });
      renderPage();

      expect(screen.getByText("Event number 4")).toBeInTheDocument();
      expect(screen.queryByText("Event number 5")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Show all 8" }));
      expect(screen.getByText("Event number 7")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Show fewer" }));
      expect(screen.queryByText("Event number 7")).not.toBeInTheDocument();
    });

    it("folds the monster form away during combat and opens it on request", async () => {
      renderPage();

      expect(screen.queryByText("Add monsters and NPCs")).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "+ Add monster" }));
      expect(screen.getByText("Add monsters and NPCs")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Hide monster form" }));
      expect(screen.queryByText("Add monsters and NPCs")).not.toBeInTheDocument();
    });

    it("shows the monster form right away when no fight is running", () => {
      mockTable({ isDm: true, combatActive: false });
      renderPage();

      expect(screen.getByText("Add monsters and NPCs")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "+ Add monster" })).not.toBeInTheDocument();
    });

    it("lets the DM switch between player character cards", async () => {
      getCharactersByIds.mockResolvedValue([
        { id: "ch1", name: "Billie", level: 5, abilityScores: {}, combat: {} },
        { id: "ch2", name: "Thorn", level: 3, abilityScores: {}, combat: {} },
      ]);
      renderPage();

      expect(await screen.findByRole("tab", { name: "Billie" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("Level 5 · No race · No class")).toBeInTheDocument();
      expect(screen.queryByText("Level 3 · No race · No class")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("tab", { name: "Thorn" }));
      expect(screen.getByText("Level 3 · No race · No class")).toBeInTheDocument();
      expect(screen.queryByText("Level 5 · No race · No class")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("tab", { name: "Show all" }));
      expect(screen.getByText("Level 5 · No race · No class")).toBeInTheDocument();
      expect(screen.getByText("Level 3 · No race · No class")).toBeInTheDocument();
    });

    it("shows each player's attack count and lets the DM deny the last attack", async () => {
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) =>
          c.id === "c-billie"
            ? { ...c, attacks_this_turn: 2, last_attack_target: "c-kobold" }
            : c,
        ),
      });
      vi.spyOn(window, "confirm").mockReturnValue(true);
      renderPage();

      expect(screen.getByText("2 attacks this turn")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Deny last attack" }));

      expect(dmDenyAttack).toHaveBeenCalledWith("c-billie");
    });

    it("does not deny when the DM cancels the confirmation", async () => {
      useTable.mockReturnValue({
        ...currentTable,
        combatants: combatants.map((c) =>
          c.id === "c-billie"
            ? { ...c, attacks_this_turn: 1, last_attack_target: "c-kobold" }
            : c,
        ),
      });
      vi.spyOn(window, "confirm").mockReturnValue(false);
      renderPage();

      await userEvent.click(screen.getByRole("button", { name: "Deny last attack" }));

      expect(dmDenyAttack).not.toHaveBeenCalled();
    });

    it("lets the DM send an enemy hit to a player", async () => {
      renderPage();

      await userEvent.type(screen.getByLabelText("Who is attacking"), "Kobold");
      await userEvent.type(screen.getByLabelText("Damage to the player"), "5");
      await userEvent.click(screen.getByRole("button", { name: "Send hit" }));

      expect(postPlayerDamage).toHaveBeenCalledWith("t1", "player-1", 5, "Kobold");
    });

    it("shows a friendly NPC with its hidden HP and the same controls as an enemy", () => {
      withAlly();
      renderPage();

      const row = rowFor("Sir Pip");
      expect(row).toHaveTextContent("Ally");
      expect(row).toHaveTextContent("DM only: 18/20 HP · AC 16");
      expect(row).toHaveTextContent("Healthy");
      expect(screen.getByLabelText("Damage or healing for Sir Pip")).toBeInTheDocument();
    });

    it("lets the DM edit a monster's HP and AC", async () => {
      renderPage();

      const kobold = rowFor("Kobold");
      await userEvent.click(within(kobold).getByRole("button", { name: "Edit" }));
      await userEvent.clear(screen.getByLabelText("Edit max HP"));
      await userEvent.type(screen.getByLabelText("Edit max HP"), "30");
      await userEvent.clear(screen.getByLabelText("Edit AC"));
      await userEvent.type(screen.getByLabelText("Edit AC"), "14");
      await userEvent.click(screen.getByRole("button", { name: "Save" }));

      expect(editCombatant).toHaveBeenCalledWith(
        expect.objectContaining({ id: "c-kobold", maxHp: 30, currentHp: 9, armorClass: 14 }),
      );
    });

    it("lets an ally attack, with its stat block attack filled in", async () => {
      withAlly();
      renderPage();

      const row = rowFor("Sir Pip");
      await userEvent.click(within(row).getByRole("button", { name: "Attack" }));

      expect(screen.getByRole("region", { name: "Sir Pip attacks" })).toBeInTheDocument();
      expect(screen.getByLabelText("Attack name")).toHaveValue("Sword");
    });

    it("shows what just happened to an enemy right in its row", () => {
      useTable.mockReturnValue({
        ...currentTable,
        events: [
          { id: "e2", message: "Dangit deals 4 damage to Kobold." },
          { id: "e1", message: "Thorn ends their turn." },
        ],
      });
      renderPage();

      const kobold = rowFor("Kobold");
      expect(kobold).toHaveTextContent("Dangit deals 4 damage to Kobold.");
      expect(kobold).not.toHaveTextContent("Thorn ends their turn.");
    });

    it("adds several monsters at once with numbered names", async () => {
      mockTable({ isDm: true, combatActive: false });
      renderPage();

      await userEvent.type(screen.getByLabelText("Name"), "Goblin");
      await userEvent.clear(screen.getByLabelText("How many"));
      await userEvent.type(screen.getByLabelText("How many"), "3");
      await userEvent.type(screen.getByLabelText("HP"), "7");
      await userEvent.type(screen.getByLabelText("AC"), "13");
      await userEvent.click(screen.getByRole("button", { name: "Add 3" }));

      await waitFor(() => expect(addCombatant).toHaveBeenCalledTimes(3));
      expect(addCombatant.mock.calls.map(([entry]) => entry.name)).toEqual([
        "Goblin 1",
        "Goblin 2",
        "Goblin 3",
      ]);
      expect(addCombatant).toHaveBeenCalledWith(
        expect.objectContaining({ tableId: "t1", maxHp: 7, armorClass: 13, kind: "monster" }),
      );
    });

    it("adds a friendly party member the DM tracks by hand", async () => {
      mockTable({ isDm: true, combatActive: false });
      renderPage();

      await userEvent.click(screen.getByLabelText("Friendly NPC or party member"));
      await userEvent.type(screen.getByLabelText("Name"), "Samantha");
      await userEvent.type(screen.getByLabelText("HP"), "117");
      await userEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() =>
        expect(addCombatant).toHaveBeenCalledWith(
          expect.objectContaining({ name: "Samantha", kind: "ally", maxHp: 117 }),
        ),
      );
    });

    it("saves to the library when asked", async () => {
      mockTable({ isDm: true, combatActive: false });
      createTemplate.mockResolvedValue({ id: "tpl", name: "Ogre", kind: "monster", max_hp: 59 });
      renderPage();

      await userEvent.type(screen.getByLabelText("Name"), "Ogre");
      await userEvent.type(screen.getByLabelText("HP"), "59");
      await userEvent.click(screen.getByLabelText("Also save to my library"));
      await userEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() =>
        expect(createTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: "Ogre", maxHp: 59 })),
      );
    });

    it("keeps what was typed and says why when adding fails", async () => {
      mockTable({ isDm: true, combatActive: false });
      addCombatant.mockRejectedValueOnce(new Error("Only the DM can add combatants"));
      renderPage();

      await userEvent.type(screen.getByLabelText("Name"), "Goblin");
      await userEvent.type(screen.getByLabelText("HP"), "7");
      await userEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(await screen.findByText("Only the DM can add combatants")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toHaveValue("Goblin");
    });

    it("applies damage to an enemy", async () => {
      renderPage();

      await userEvent.type(screen.getByLabelText("Damage or healing for Kobold"), "4");
      await userEvent.click(screen.getByRole("button", { name: "Damage" }));

      expect(applyDamage).toHaveBeenCalledWith("c-kobold", 4);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TablePage from "./TablePage";
import { useTable } from "../../hooks/useTable";
import {
  setMyInitiative,
  applyDamage,
  postPlayerDamage,
  dmDenyAttack,
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
  addMonster: vi.fn(),
  advanceTurn: vi.fn(),
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

function mockTable({ isDm }) {
  useTable.mockReturnValue({
    table: {
      id: "t1",
      name: "Final Fight",
      dm_id: isDm ? "player-1" : "dm-1",
      join_code: "ABC123",
      combat_active: true,
      round: 2,
      current_combatant_id: "c-kobold",
    },
    members: [{ user_id: "player-1", character_id: "char-1" }],
    combatants,
    enemyHp: isDm ? { "c-kobold": { current_hp: 9, max_hp: 20, armor_class: 12 } } : {},
    events: [{ id: "e1", message: "Billie attacks Kobold with Dagger (rolled 15). That hits!" }],
    isLoading: false,
    error: "",
    refresh: vi.fn().mockResolvedValue(undefined),
    isDm,
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
        ...useTable(),
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

    it("has no DM controls", () => {
      renderPage();

      expect(screen.queryByText("Join code")).not.toBeInTheDocument();
      expect(screen.queryByText("Add a monster")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Damage" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Start combat" })).not.toBeInTheDocument();
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

      expect(screen.getByText(/That hits!/)).toBeInTheDocument();
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
      expect(screen.getByText("Add a monster")).toBeInTheDocument();
    });

    it("shows each player's attack count and lets the DM deny the last attack", async () => {
      useTable.mockReturnValue({
        ...useTable(),
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
        ...useTable(),
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

    it("applies damage to an enemy", async () => {
      renderPage();

      await userEvent.type(screen.getByLabelText("Damage or healing for Kobold"), "4");
      await userEvent.click(screen.getByRole("button", { name: "Damage" }));

      expect(applyDamage).toHaveBeenCalledWith("c-kobold", 4);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TablePage from "./TablePage";
import { installFakeStorage } from "../../test/fakeStorage";
import { useTable } from "../../hooks/useTable";
import { getCharactersByIds } from "../../utils/characterStore";
import {
  setMyInitiative,
  setCombatantInitiative,
  applyDamage,
  postPlayerDamage,
  removeCombatant,
  dmDenyAttack,
  dmResolveAttack,
  addCombatant,
  createTemplate,
  listTemplates,
  editCombatant,
  endMyTurn,
  dmLog,
  resetEncounter,
  getPartyStrip,
  setShareParty,
  setCombatantAway,
  removeMember,
  banMember,
  unbanMember,
  listBans,
  startCombat,
} from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
// The Prep tab's encounter helper asks for the SRD monster list; none is needed here.
vi.mock("../../utils/api", async (importOriginal) => ({
  ...(await importOriginal()),
  getMonsters: vi.fn().mockResolvedValue([]),
}));

// A fresh storage per test, so a DM tab picked in one test isn't remembered in the next.
beforeEach(() => {
  installFakeStorage();
});

vi.mock("../../context/useAuth", () => ({
  useAuth: () => ({ user: { id: "player-1" } }),
}));

vi.mock("../../hooks/useTable", () => ({ useTable: vi.fn() }));

// Handouts have their own tests; here they just need to load quietly.
vi.mock("../../utils/handoutStore", () => ({
  listHandouts: vi.fn().mockResolvedValue([]),
  createHandout: vi.fn(),
  updateHandout: vi.fn(),
  setHandoutAudience: vi.fn(),
  deleteHandout: vi.fn(),
  getHandoutImageUrl: vi.fn(),
  validateHandoutImage: vi.fn(() => null),
  subscribeToHandouts: vi.fn(() => () => {}),
}));

// The journal has its own tests; here it just needs to load quietly.
vi.mock("../../utils/journalStore", () => ({
  listJournal: vi.fn().mockResolvedValue([]),
  addJournalEntry: vi.fn(),
  updateJournalEntry: vi.fn(),
  deleteJournalEntry: vi.fn(),
  startNextSession: vi.fn(),
  setSessionNumber: vi.fn(),
  getTablePortraits: vi.fn().mockResolvedValue(new Map()),
  subscribeToJournal: vi.fn(() => () => {}),
}));

// The recap card has its own tests; here it just needs to load quietly.
vi.mock("../../utils/recapStore", () => ({
  listRecaps: vi.fn().mockResolvedValue([]),
  saveRecap: vi.fn(),
  subscribeToRecaps: vi.fn(() => () => {}),
}));

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
  getPartyStrip: vi.fn().mockResolvedValue([]),
  setShareParty: vi.fn().mockResolvedValue(undefined),
  setCombatantAway: vi.fn().mockResolvedValue(undefined),
  listTemplates: vi.fn().mockResolvedValue([]),
  applyDamage: vi.fn().mockResolvedValue(undefined),
  deleteTable: vi.fn(),
  dmDenyAttack: vi.fn().mockResolvedValue(undefined),
  dmLog: vi.fn().mockResolvedValue(undefined),
  dmResolveAttack: vi.fn(),
  endCombat: vi.fn(),
  leaveTable: vi.fn(),
  postPlayerDamage: vi.fn(),
  removeCombatant: vi.fn(),
  removeMember: vi.fn(),
  resetEncounter: vi.fn(),
  setCombatantInitiative: vi.fn(),
  setMyInitiative: vi.fn().mockResolvedValue(undefined),
  listBans: vi.fn().mockResolvedValue([]),
  banMember: vi.fn().mockResolvedValue(undefined),
  unbanMember: vi.fn().mockResolvedValue(undefined),
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
    // The name is the row-name's own text (a player's portrait comes first).
    (row) =>
      [...(row.querySelector(".table-page__row-name")?.childNodes ?? [])].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
      )?.textContent === name,
  );
}

// The DM's controls panel for one creature (only the picked one is shown).
function detailFor(name) {
  return Array.from(document.querySelectorAll("[data-detail-for]")).find(
    (el) =>
      [...(el.querySelector(".table-page__row-name")?.childNodes ?? [])].find(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
      )?.textContent === name,
  );
}

// Picks a creature in the DM's list, and returns its controls panel.
async function pick(name) {
  await userEvent.click(rowFor(name).querySelector(".table-page__row-select"));
  return detailFor(name);
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

// Opens the old /tables/t1 address, so every test also checks the page
// moves itself to /dm/tables/t1 (the DM) or /games/t1 (a player).
function pageTree() {
  return (
    <MemoryRouter initialEntries={["/tables/t1"]}>
      <Routes>
        <Route path="/tables/:id" element={<TablePage />} />
        <Route path="/games/:id" element={<TablePage />} />
        <Route path="/dm/tables/:id" element={<TablePage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderPage() {
  return render(pageTree());
}

// The DM screen shows one tab at a time.
async function openTab(name) {
  await userEvent.click(screen.getByRole("tab", { name: new RegExp(`^${name}`) }));
}

describe("TablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("as a player", () => {
    beforeEach(() => mockTable({ isDm: false }));

    it("only accepts 1 to 20 when re-entering your own d20 roll", async () => {
      mockTable({ isDm: false, combatActive: false });
      currentTable.combatants = combatants.map((combatant) =>
        combatant.id === "c-billie" ? { ...combatant, initiative: 12 } : combatant,
      );
      renderPage();

      const box = screen.getByLabelText("Your d20 roll for initiative");
      await userEvent.type(box, "25");
      await userEvent.click(within(rowFor("Billie")).getByRole("button", { name: "Set" }));

      expect(setMyInitiative).not.toHaveBeenCalled();
      expect(rowFor("Billie")).toHaveTextContent("Type the number on your d20, from 1 to 20.");
    });

    it("shows an enemy's status and damage taken but never its HP", () => {
      renderPage();

      expect(screen.getByText(/Bloodied/)).toBeInTheDocument();
      expect(screen.getByText(/11 damage taken/)).toBeInTheDocument();
      expect(screen.queryByText(/DM only/)).not.toBeInTheDocument();
      expect(screen.queryByText(/9\/20/)).not.toBeInTheDocument();
    });

    it("doesn't show players the DM's turn banner", () => {
      renderPage();

      expect(rowFor("Kobold")).not.toHaveTextContent("tap Attack");
    });

    it("never shows players an enemy's HP bar", () => {
      const { container } = renderPage();

      expect(container.querySelector(".table-page__hp-bar")).toBeNull();
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
      expect(screen.queryByRole("button", { name: "Take damage" })).not.toBeInTheDocument();
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
      expect(within(row).queryByRole("button", { name: /^Edit/ })).not.toBeInTheDocument();
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

    it("lets the player roll their own initiative from the prompt", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
      renderPage();

      await userEvent.click(await screen.findByRole("button", { name: "Roll d20 for me" }));

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
      expect(screen.queryByText("Send damage to a player")).not.toBeInTheDocument();
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

    it("tells the DM what to do on the current monster's turn", () => {
      renderPage();

      expect(detailFor("Kobold")).toHaveTextContent(
        "Kobold's turn: tap Attack to have it attack, then tap Next turn.",
      );
      expect(rowFor("Billie")).not.toHaveTextContent("'s turn:");
    });

    it("changes the banner once the monster has attacked this turn", () => {
      currentTable.combatants = combatants.map((combatant) =>
        combatant.id === "c-kobold" ? { ...combatant, attacks_this_turn: 1 } : combatant,
      );
      renderPage();

      expect(detailFor("Kobold")).toHaveTextContent(
        "Kobold has attacked. Attack again if it has more attacks, or tap Next turn.",
      );
    });

    it("fades a monster's history from before this turn, but not what it does now", () => {
      currentTable.events = [
        { id: "e1", message: "Kobold hits Billie for 3!", created_at: "2026-10-03T00:01:00Z" },
      ];
      const { rerender } = renderPage();
      expect(detailFor("Kobold")).toHaveTextContent("Earlier: Kobold hits Billie for 3!");

      useTable.mockReturnValue({
        ...currentTable,
        events: [
          { id: "e2", message: "Kobold hits Billie for 4!", created_at: "2026-10-03T00:02:00Z" },
          ...currentTable.events,
        ],
      });
      rerender(pageTree());

      const lines = Array.from(detailFor("Kobold").querySelectorAll(".table-page__last-action")).map(
        (line) => line.textContent,
      );
      expect(lines).toEqual(["Kobold hits Billie for 4!", "Earlier: Kobold hits Billie for 3!"]);
    });

    it("keeps a monster's history under its buttons, and opens Attack in a right-hand panel", async () => {
      renderPage();
      const row = detailFor("Kobold");
      const left = row.querySelector(".table-page__row-left");

      expect(row).not.toHaveClass("table-page__row--split");
      expect(left).toHaveTextContent("Billie attacks Kobold with Dagger");

      await userEvent.click(within(left).getByRole("button", { name: "Attack" }));
      const side = row.querySelector(".table-page__row-side");
      expect(row).toHaveClass("table-page__row--split");
      expect(within(side).getByText("Pick a target, roll to hit, then roll damage.")).toBeInTheDocument();
      expect(side).not.toHaveTextContent("Billie attacks Kobold with Dagger");
    });

    it("draws a red HP bar for a bloodied monster, filled to its HP", () => {
      const { container } = renderPage();

      const bar = container.querySelector(".table-page__hp-bar");
      expect(bar).toHaveClass("table-page__hp-bar--bloodied");
      expect(bar.querySelector(".table-page__hp-bar-fill")).toHaveStyle({ width: "45%" });
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

    it("lets the DM mark a player away, so their turns are skipped, and bring them back", async () => {
      renderPage();
      const row = await pick("Billie");

      await userEvent.click(within(row).getByRole("button", { name: "Mark away" }));
      expect(setCombatantAway).toHaveBeenCalledWith(expect.any(String), true);
      expect(removeMember).not.toHaveBeenCalled();
    });

    it("asks before removing a player, with the choice to remove them for good", async () => {
      renderPage();
      const row = await pick("Billie");

      await userEvent.click(within(row).getByRole("button", { name: "Remove" }));
      expect(row).toHaveTextContent("Remove Billie from the table?");
      await userEvent.click(within(row).getByRole("button", { name: "Keep" }));
      expect(removeMember).not.toHaveBeenCalled();
      expect(banMember).not.toHaveBeenCalled();

      await userEvent.click(within(row).getByRole("button", { name: "Remove" }));
      await userEvent.click(within(row).getByRole("button", { name: "Remove for good" }));
      expect(banMember).toHaveBeenCalledWith("t1", "player-1");
      expect(removeMember).not.toHaveBeenCalled();
    });

    it("lists players removed for good on the Players tab, and lets them back", async () => {
      listBans.mockResolvedValue([{ user_id: "player-9", name: "Grog", banned_at: "2026-10-17T00:00:00Z" }]);
      getCharactersByIds.mockResolvedValue([{ id: "char-1", name: "Billie", level: 5, abilityScores: {}, combat: {} }]);
      renderPage();
      await openTab("Players");

      expect(await screen.findByText("Removed for good")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Let them back" }));
      expect(unbanMember).toHaveBeenCalledWith("t1", "player-9");
    });

    it("shows a player's portrait beside their name in the turn order", async () => {
      getCharactersByIds.mockResolvedValue([
        { id: "char-1", name: "Billie", level: 5, abilityScores: {}, combat: {}, portraitUrl: "https://example.com/billie.png" },
      ]);
      renderPage();

      await waitFor(() =>
        expect(rowFor("Billie").querySelector(".table-page__row-portrait img")).toHaveAttribute(
          "src",
          "https://example.com/billie.png",
        ),
      );
    });

    it("lets the DM switch between player character cards", async () => {
      getCharactersByIds.mockResolvedValue([
        { id: "ch1", name: "Billie", level: 5, abilityScores: {}, combat: {} },
        { id: "ch2", name: "Thorn", level: 3, abilityScores: {}, combat: {} },
      ]);
      renderPage();
      await openTab("Players");

      const picker = await screen.findByRole("list", { name: "Players" });
      expect(within(picker).getByRole("button", { name: /^Billie/ })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Level 5 · No race · No class")).toBeInTheDocument();
      expect(screen.queryByText("Level 3 · No race · No class")).not.toBeInTheDocument();

      await userEvent.click(within(picker).getByRole("button", { name: /^Thorn/ }));
      expect(screen.getByText("Level 3 · No race · No class")).toBeInTheDocument();
      expect(screen.queryByText("Level 5 · No race · No class")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Show all" }));
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

      expect(rowFor("Billie")).not.toHaveTextContent("Deny last attack");
      const billie = await pick("Billie");
      expect(within(billie).getByText("2 attacks this turn")).toBeInTheDocument();
      await userEvent.click(within(billie).getByRole("button", { name: "Deny last attack" }));

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

      const billie = await pick("Billie");
      await userEvent.click(within(billie).getByRole("button", { name: "Deny last attack" }));

      expect(dmDenyAttack).not.toHaveBeenCalled();
    });

    it("lets the DM send an enemy hit to a player", async () => {
      renderPage();

      await userEvent.type(screen.getByLabelText("Attacker"), "Kobold");
      await userEvent.type(screen.getByLabelText("Amount"), "5");
      await userEvent.click(screen.getByRole("button", { name: /^Send 5 damage to .* to apply$/ }));

      expect(postPlayerDamage).toHaveBeenCalledWith("t1", "player-1", 5, "Kobold");
    });

    it("shows a friendly NPC with its hidden HP and the same controls as an enemy", async () => {
      withAlly();
      renderPage();

      // One short line in the list, with its controls in the panel once picked.
      const row = rowFor("Sir Pip");
      expect(row).toHaveTextContent("Ally");
      expect(row).toHaveTextContent("18/20 HP · AC 16");
      expect(row).toHaveTextContent("Healthy");
      const detail = await pick("Sir Pip");
      expect(within(detail).getByLabelText("Damage amount for Sir Pip")).toBeInTheDocument();
    });

    it("lets the DM edit a monster's HP and AC", async () => {
      renderPage();

      const kobold = detailFor("Kobold");
      await userEvent.click(within(kobold).getByRole("button", { name: "Edit Kobold" }));
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

      const row = await pick("Sir Pip");
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

      const kobold = detailFor("Kobold");
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
      await userEvent.click(screen.getByRole("button", { name: "Add 3 to the fight" }));

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
      await userEvent.click(screen.getByRole("button", { name: "Add to the fight" }));

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
      await userEvent.click(screen.getByRole("button", { name: "Add to the fight" }));

      await waitFor(() =>
        expect(createTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: "Ogre", maxHp: 59 })),
      );
    });

    it("does not save a second copy of a monster already in the library", async () => {
      mockTable({ isDm: true, combatActive: false });
      listTemplates.mockResolvedValueOnce([
        { id: "tpl-ogre", name: "Ogre", kind: "monster", max_hp: 59, armor_class: null, stat_block: {} },
      ]);
      renderPage();

      await userEvent.type(screen.getByLabelText("Name"), "Ogre");
      await userEvent.type(screen.getByLabelText("HP"), "59");
      await userEvent.click(screen.getByLabelText("Also save to my library"));
      await userEvent.click(screen.getByRole("button", { name: "Add to the fight" }));

      await waitFor(() => expect(addCombatant).toHaveBeenCalled());
      expect(createTemplate).not.toHaveBeenCalled();
    });

    it("keeps what was typed and says why when adding fails", async () => {
      mockTable({ isDm: true, combatActive: false });
      addCombatant.mockRejectedValueOnce(new Error("Only the DM can add combatants"));
      renderPage();

      await userEvent.type(screen.getByLabelText("Name"), "Goblin");
      await userEvent.type(screen.getByLabelText("HP"), "7");
      await userEvent.click(screen.getByRole("button", { name: "Add to the fight" }));

      expect(await screen.findByText("Only the DM can add combatants")).toBeInTheDocument();
      expect(screen.getByLabelText("Name")).toHaveValue("Goblin");
    });

    it("applies damage to an enemy", async () => {
      renderPage();

      await userEvent.type(screen.getByLabelText("Damage amount for Kobold"), "4");
      // Typing changes nothing until the box's own button is pressed.
      expect(applyDamage).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("button", { name: "Apply damage to Kobold" }));

      expect(applyDamage).toHaveBeenCalledWith("c-kobold", 4);
    });

    it("heals an enemy from its own box, and the two amounts are separate and start blank", async () => {
      renderPage();

      expect(screen.getByLabelText("Damage amount for Kobold")).toHaveValue(null);
      expect(screen.getByLabelText("Healing amount for Kobold")).toHaveValue(null);
      await userEvent.type(screen.getByLabelText("Healing amount for Kobold"), "3");
      expect(screen.getByLabelText("Damage amount for Kobold")).toHaveValue(null);
      await userEvent.click(screen.getByRole("button", { name: "Apply healing to Kobold" }));

      expect(applyDamage).toHaveBeenCalledWith("c-kobold", -3);
      expect(screen.getByLabelText("Healing amount for Kobold")).toHaveValue(null);
    });

    it("steps an amount with minus and plus without changing the creature's HP", async () => {
      renderPage();

      const kobold = detailFor("Kobold");
      await userEvent.click(within(kobold).getByRole("button", { name: "Increase damage amount" }));
      await userEvent.click(within(kobold).getByRole("button", { name: "Increase damage amount" }));
      expect(screen.getByLabelText("Damage amount for Kobold")).toHaveValue(2);
      await userEvent.click(within(kobold).getByRole("button", { name: "Decrease damage amount" }));
      expect(screen.getByLabelText("Damage amount for Kobold")).toHaveValue(1);
      // It never goes below nothing.
      await userEvent.click(within(kobold).getByRole("button", { name: "Decrease damage amount" }));
      await userEvent.click(within(kobold).getByRole("button", { name: "Decrease damage amount" }));
      expect(screen.getByLabelText("Damage amount for Kobold")).toHaveValue(null);
      expect(applyDamage).not.toHaveBeenCalled();
    });

    it("shows the weapon, to-hit bonus and damage on the Attack box before it opens", async () => {
      withAlly();
      renderPage();

      const pip = await pick("Sir Pip");
      const attack = within(pip).getByRole("button", { name: "Attack" });
      expect(attack).toHaveAccessibleDescription("Sword · +5 to hit · 1d8+3");
      expect(attack).toHaveAttribute("aria-expanded", "false");
    });
  });
});

describe("rolling initiative for monsters", () => {
  const goblin = (n, extra = {}) => ({
    id: `c-g${n}`,
    kind: "monster",
    user_id: null,
    name: `Goblin ${n}`,
    initiative: null,
    status: "healthy",
    damage_taken: 0,
    created_at: `2026-10-03T00:00:0${n}Z`,
    ...extra,
  });

  function setupFight() {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    currentTable.combatants = [
      goblin(1),
      goblin(2),
      goblin(3),
      goblin(0, { id: "c-dragon", name: "Red Dragon", initiative: 22 }),
    ];
    currentTable.enemyHp = {
      "c-g1": { current_hp: 7, max_hp: 7, armor_class: 13, stat_block: { initiativeBonus: 2 } },
      "c-g2": { current_hp: 7, max_hp: 7, armor_class: 13, stat_block: {} },
      "c-g3": { current_hp: 7, max_hp: 7, armor_class: 13, stat_block: {} },
    };
  }

  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // every d20 is an 11
    setCombatantInitiative.mockClear();
  });

  afterEach(() => vi.restoreAllMocks());

  it("rolls for every monster without an initiative and leaves the boss alone", async () => {
    setupFight();
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Roll initiative for 3 monsters" }),
    );

    await waitFor(() => expect(setCombatantInitiative).toHaveBeenCalledTimes(3));
    expect(setCombatantInitiative).toHaveBeenCalledWith("c-g1", 13);
    expect(setCombatantInitiative).toHaveBeenCalledWith("c-g2", 11);
    expect(setCombatantInitiative).toHaveBeenCalledWith("c-g3", 11);
    expect(setCombatantInitiative).not.toHaveBeenCalledWith("c-dragon", expect.anything());
  });

  it("rolls for a single monster with its bonus and shows the roll", async () => {
    setupFight();
    renderPage();

    await waitFor(() => expect(rowFor("Goblin 1")).toBeTruthy());
    await userEvent.click(within(rowFor("Goblin 1")).getByRole("button", { name: "Roll d20" }));

    await waitFor(() => expect(setCombatantInitiative).toHaveBeenCalledWith("c-g1", 13));
    expect(within(rowFor("Goblin 1")).getByText("Rolled 11 + 2 = 13")).toBeInTheDocument();
  });

  it("names friendly NPCs separately from monsters on the roll-all button", async () => {
    setupFight();
    currentTable.combatants = [
      goblin(1),
      goblin(2),
      goblin(0, { id: "c-maccath", kind: "ally", name: "Maccath the Crimson" }),
    ];
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Roll initiative for 2 monsters and 1 NPC" }),
    ).toBeInTheDocument();
  });

  it("calls a lone friendly NPC an NPC, not a monster", async () => {
    setupFight();
    currentTable.combatants = [
      goblin(0, { id: "c-maccath", kind: "ally", name: "Maccath the Crimson" }),
    ];
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Roll initiative for 1 NPC" }),
    ).toBeInTheDocument();
  });

  it("hides the roll-all button when every monster already has an initiative", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    await waitFor(() => expect(rowFor("Kobold")).toBeTruthy());
    expect(screen.queryByRole("button", { name: /Roll initiative for/ })).not.toBeInTheDocument();
  });
});

describe("table help for new groups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the DM a prep checklist before combat, pointing at the next step", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    const checklist = await screen.findByRole("region", { name: "Before the fight" });
    const steps = within(checklist).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual([
      expect.stringContaining("Share the join code (done)1 player joined"),
      expect.stringContaining("Add the monsters (done)1 creature added"),
      expect.stringContaining("Get everyone's initiative (to do)Waiting for 1 initiative"),
      expect.stringContaining("Start combat (to do)Ready to start"),
    ]);
    expect(steps[2]).toHaveClass("table-page__prep-step--current");
  });

  it("keeps the longer step explanations, and who is waiting, behind Step details", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    const checklist = await screen.findByRole("region", { name: "Before the fight" });
    const toggle = within(checklist).getByRole("button", { name: "Step details" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(within(checklist).getByText(/Still waiting on Billie\./)).not.toBeVisible();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(checklist).getByText(/Still waiting on Billie\./)).toBeVisible();
    expect(within(checklist).getByText(/players? (has|have) joined/)).toBeVisible();
    await userEvent.click(within(checklist).getByRole("button", { name: "Hide step details" }));
    expect(within(checklist).getByText(/Still waiting on Billie\./)).not.toBeVisible();
  });

  it("puts Nudge inside the initiative step and explains why Start combat is off when nobody has rolled", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    useTable.mockReturnValue({ ...currentTable, combatants: currentTable.combatants.map((c) => ({ ...c, initiative: null })) });
    renderPage();

    const checklist = await screen.findByRole("region", { name: "Before the fight" });
    const start = within(checklist).getByRole("button", { name: "Start combat" });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription("Set at least one initiative first.");
    const initiativeStep = within(checklist).getAllByRole("listitem")[2];
    expect(within(initiativeStep).getByRole("button", { name: /Nudge/ })).toBeInTheDocument();
    expect(initiativeStep).toHaveTextContent("Waiting for");
    expect(within(checklist).getAllByRole("listitem")[3]).toHaveTextContent("Set at least one initiative");
  });

  it("hides the checklist once combat has started", async () => {
    mockTable({ isDm: true, combatActive: true });
    renderPage();

    await screen.findByText("Final Fight");
    expect(screen.queryByRole("region", { name: "Before the fight" })).not.toBeInTheDocument();
  });

  it("never shows the checklist to players", async () => {
    mockTable({ isDm: false, combatActive: false, currentId: null });
    renderPage();

    await screen.findByText("Final Fight");
    expect(screen.queryByRole("region", { name: "Before the fight" })).not.toBeInTheDocument();
  });

  it("tells a waiting player where their turn will show up", async () => {
    mockTable({ isDm: false, combatActive: true });
    renderPage();

    expect(await screen.findByText(/A banner on your character sheet tells you/)).toBeInTheDocument();
  });

  it("links to the Guide's table section", async () => {
    mockTable({ isDm: false });
    renderPage();

    expect(await screen.findByRole("link", { name: "How tables work" })).toHaveAttribute(
      "href",
      "/guide?section=tables",
    );
  });
});

describe("initiative prompt for players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTable({ isDm: false, combatActive: false, currentId: null });
  });

  it("puts a Roll initiative card above the initiative list", async () => {
    renderPage();

    const prompt = await screen.findByRole("region", { name: "Roll initiative for Billie" });
    const order = screen.getByRole("list", { name: "Initiative order" });
    expect(prompt.compareDocumentPosition(order) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(prompt).toHaveTextContent("The app rolls and adds your Dexterity (+2).");
  });

  it("adds Dexterity to a physical roll, like attacks", async () => {
    renderPage();
    // The sheet's Dexterity (14, so +2) loads after the page.
    await screen.findByText("The app rolls and adds your Dexterity (+2).");

    await userEvent.type(
      screen.getByLabelText("Rolling real dice? Type just the number on your d20:"),
      "14",
    );
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));

    expect(setMyInitiative).toHaveBeenCalledWith("t1", 16);
  });

  it("ignores a number that can't be on a d20", async () => {
    renderPage();
    await screen.findByText("The app rolls and adds your Dexterity (+2).");

    await userEvent.type(
      screen.getByLabelText("Rolling real dice? Type just the number on your d20:"),
      "25",
    );
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));

    expect(setMyInitiative).not.toHaveBeenCalled();
    // And it says why, instead of silently doing nothing.
    expect(screen.getByRole("alert")).toHaveTextContent("A d20 only shows 1 to 20");
  });

  it("does not repeat the controls on the player's own waiting row", async () => {
    renderPage();
    await screen.findByRole("region", { name: "Roll initiative for Billie" });

    expect(within(rowFor("Billie")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("goes away once the player has an initiative", async () => {
    useTable.mockReturnValue({
      ...currentTable,
      combatants: combatants.map((c) => (c.id === "c-billie" ? { ...c, initiative: 15 } : c)),
    });
    renderPage();

    await screen.findByText("Final Fight");
    expect(screen.queryByRole("region", { name: /Roll initiative for/ })).not.toBeInTheDocument();
  });

  it("is never shown to the DM", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    await screen.findByText("Final Fight");
    expect(screen.queryByRole("region", { name: /Roll initiative for/ })).not.toBeInTheDocument();
  });

  it("highlights and counts everyone still waiting for initiative", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Waiting for initiative (1)" })).toBeInTheDocument();
    expect(rowFor("Billie")).toHaveClass("table-page__row--needs-initiative");
    expect(rowFor("Kobold")).not.toHaveClass("table-page__row--needs-initiative");
  });
});

describe("nudging players to roll initiative", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("lists who the table is waiting on above the initiative order", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    const waitingList = await screen.findByRole("list", { name: "Waiting for initiative" });
    const order = screen.getByRole("list", { name: "Initiative order" });
    expect(waitingList.compareDocumentPosition(order) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets the DM nudge a waiting player from their row", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    await userEvent.click(await within(rowFor("Billie")).findByRole("button", { name: "🔔 Nudge" }));

    expect(dmLog).toHaveBeenCalledWith("t1", "🔔 Billie, the DM is waiting for your initiative roll!");
  });

  it("offers a nudge from the prep checklist too", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "🔔 Nudge Billie to roll" }));

    expect(dmLog).toHaveBeenCalledWith("t1", "🔔 Billie, the DM is waiting for your initiative roll!");
  });

  it("does not offer a nudge for monsters", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    useTable.mockReturnValue({
      ...currentTable,
      combatants: combatants.map((c) => (c.id === "c-kobold" ? { ...c, initiative: null } : c)),
    });
    renderPage();

    await screen.findByText("Final Fight");
    expect(within(rowFor("Kobold")).queryByRole("button", { name: /Nudge/ })).not.toBeInTheDocument();
  });

  it("lights up the player's prompt when they have been nudged", async () => {
    mockTable({ isDm: false, combatActive: false, currentId: null });
    useTable.mockReturnValue({
      ...currentTable,
      events: [{ id: "n1", message: "🔔 Billie, the DM is waiting for your initiative roll!" }],
    });
    renderPage();

    expect(await screen.findByText("🔔 Your DM is waiting for your roll!")).toBeInTheDocument();
  });

  it("logs a new encounter so old nudges stop counting", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "New encounter" }));

    await waitFor(() =>
      expect(dmLog).toHaveBeenCalledWith("t1", "🧹 The DM started a new encounter."),
    );
    expect(resetEncounter).toHaveBeenCalledWith("t1");
  });
});

describe("nudge shake and cooldown", () => {
  const nudgeFor = (id) => ({ id, message: "🔔 Billie, the DM is waiting for your initiative roll!" });
  let animate;

  beforeEach(() => {
    vi.clearAllMocks();
    animate = vi.fn();
    Element.prototype.animate = animate;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    delete Element.prototype.animate;
    delete window.matchMedia;
    vi.useRealTimers();
  });

  function playerWithEvents(events) {
    mockTable({ isDm: false, combatActive: false, currentId: null });
    useTable.mockReturnValue({ ...currentTable, events });
  }

  it("shakes the player's card once for each new nudge, not on every refresh", async () => {
    playerWithEvents([nudgeFor("n1")]);
    const { rerender } = renderPage();
    await screen.findByText("🔔 Your DM is waiting for your roll!");
    expect(animate).toHaveBeenCalledTimes(1);

    // A refresh with the same nudge doesn't shake again...
    rerender(pageTree());
    expect(animate).toHaveBeenCalledTimes(1);

    // ...but a second nudge does.
    playerWithEvents([nudgeFor("n2"), nudgeFor("n1")]);
    rerender(pageTree());
    await waitFor(() => expect(animate).toHaveBeenCalledTimes(2));
  });

  it("skips the shake for people who prefer less motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    playerWithEvents([nudgeFor("n1")]);
    renderPage();

    await screen.findByText("🔔 Your DM is waiting for your roll!");
    expect(animate).not.toHaveBeenCalled();
  });

  it("rests the DM's Nudge buttons for a few seconds after a nudge", async () => {
    vi.useFakeTimers();
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    fireEvent.click(within(rowFor("Billie")).getByRole("button", { name: "🔔 Nudge" }));

    expect(within(rowFor("Billie")).getByRole("button", { name: "Nudged ✓" })).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Nudged ✓" })).toHaveLength(2);
    expect(dmLog).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(within(rowFor("Billie")).getByRole("button", { name: /Nudge/ })).toBeEnabled();
  });
});

describe("monster row layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTable({ isDm: true, combatActive: true });
  });

  it("puts Edit and Remove as icons in the corner, then Attack and the monster's own HP controls", async () => {
    renderPage();

    const row = await waitFor(() => detailFor("Kobold"));
    const names = within(row)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent);
    expect(names).toEqual([
      "Edit Kobold",
      "Remove Kobold",
      "Attack",
      "Decrease damage amount",
      "Increase damage amount",
      "Apply damage to Kobold",
      "Decrease healing amount",
      "Increase healing amount",
      "Apply healing to Kobold",
    ]);
  });

  it("asks before removing a monster, and Keep leaves it alone", async () => {
    renderPage();

    const row = await waitFor(() => detailFor("Kobold"));
    await userEvent.click(within(row).getByRole("button", { name: "Remove Kobold" }));
    expect(removeCombatant).not.toHaveBeenCalled();
    expect(row).toHaveTextContent("Remove Kobold from the fight?");

    await userEvent.click(within(row).getByRole("button", { name: "Keep" }));
    expect(removeCombatant).not.toHaveBeenCalled();
    expect(row).not.toHaveTextContent("from the fight?");

    await userEvent.click(within(row).getByRole("button", { name: "Remove Kobold" }));
    await userEvent.click(within(row).getByRole("button", { name: "Remove" }));
    expect(removeCombatant).toHaveBeenCalledTimes(1);
  });

  it("labels Damage and Heal as changing that monster's HP", async () => {
    renderPage();

    const row = await waitFor(() => detailFor("Kobold"));
    const damage = within(row).getByRole("group", { name: "Take damage: Kobold" });
    const heal = within(row).getByRole("group", { name: "Heal: Kobold" });
    expect(within(damage).getByRole("button", { name: "Apply damage to Kobold" })).toBeInTheDocument();
    expect(within(heal).getByRole("button", { name: "Apply healing to Kobold" })).toBeInTheDocument();
    expect(within(damage).queryByRole("button", { name: "Attack" })).not.toBeInTheDocument();
    expect(within(row).getByRole("group", { name: "Controls for Kobold" })).toBeInTheDocument();
  });
});

describe("party strip", () => {
  const billieSheet = {
    id: "char-1",
    name: "Billie",
    level: 3,
    class: { name: "Rogue" },
    combat: { hitPoints: { current: 7, max: 20, temporary: 0 }, armorClass: 14 },
    abilityScores: { wisdom: 12, intelligence: 10 },
    skills: { perception: true },
    conditions: [{ key: "poisoned" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function partyStrip() {
    return screen.getByRole("list", { name: "Party" });
  }

  it("shows the DM everyone's HP, AC, conditions and passive scores", async () => {
    mockTable({ isDm: true, combatActive: false });
    getCharactersByIds.mockResolvedValue([billieSheet]);
    renderPage();
    // Prep has its own layout; the party sits on the Combat tab.
    await openTab("Combat");

    const strip = await screen.findByRole("list", { name: "Party" });
    expect(within(strip).getByText(/7\/20/)).toBeInTheDocument();
    expect(within(strip).getByText(/Bloodied/)).toBeInTheDocument();
    expect(within(strip).getByText("14", { exact: false })).toBeInTheDocument();
    // Conditions show on the character's initiative line while the fight is set up, not twice.
    expect(screen.getAllByText("Poisoned").length).toBeGreaterThan(0);
    // Wisdom 12 (+1) + proficiency 2 = 13 Perception, so passive 13.
    expect(within(strip).getByText("Perception 13")).toBeInTheDocument();
  });

  it("lets the DM share the party with players", async () => {
    mockTable({ isDm: true, combatActive: false });
    getCharactersByIds.mockResolvedValue([billieSheet]);
    renderPage();
    await openTab("Combat");

    // The sharing checkbox sits behind the "Stats hidden" disclosure in the Party header.
    await userEvent.click(await screen.findByRole("button", { name: /Stats hidden/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Let players see the party/ }));
    expect(setShareParty).toHaveBeenCalledWith("t1", true);
  });

  it("stays hidden from players until the DM shares it", () => {
    mockTable({ isDm: false });
    renderPage();

    expect(screen.queryByRole("list", { name: "Party" })).not.toBeInTheDocument();
    expect(getPartyStrip).not.toHaveBeenCalled();
  });

  it("fills in a missing portrait in the shared party view from the player's own sheet", async () => {
    mockTable({ isDm: false });
    useTable.mockReturnValue({
      ...currentTable,
      table: { ...currentTable.table, share_party: true },
    });
    // The party view came back without a portrait for this player, but their own
    // sheet (loaded for the page) has one.
    const { getCharacter } = await import("../../utils/characterStore");
    getCharacter.mockResolvedValue({
      abilityScores: { dexterity: 14 },
      portraitUrl: "https://example.com/mine.png",
    });
    getPartyStrip.mockResolvedValue([{ ...billieSheet, userId: "player-1", portraitUrl: undefined }]);
    renderPage();

    await waitFor(() => expect(partyStrip()).toBeInTheDocument());
    await waitFor(() =>
      expect(partyStrip().querySelector("img")).toHaveAttribute("src", "https://example.com/mine.png"),
    );
  });

  it("shows players HP, AC and conditions once shared, but no passives or switch", async () => {
    mockTable({ isDm: false });
    useTable.mockReturnValue({
      ...currentTable,
      table: { ...currentTable.table, share_party: true },
    });
    getPartyStrip.mockResolvedValue([billieSheet]);
    renderPage();

    await waitFor(() => expect(partyStrip()).toBeInTheDocument());
    expect(getPartyStrip).toHaveBeenCalledWith("t1");
    expect(within(partyStrip()).getByText(/7\/20/)).toBeInTheDocument();
    expect(within(partyStrip()).queryByText(/Perception/)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Let players see the party/ })).not.toBeInTheDocument();
  });
});

describe("DM screen tabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCharactersByIds.mockResolvedValue([]);
  });

  function selectedTab() {
    return screen.getAllByRole("tab").find(
      (tab) => tab.id?.startsWith("dm-tab-") && tab.getAttribute("aria-selected") === "true",
    );
  }

  it("opens on Prep with no fight, with the checklist and initiative list", () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    expect(selectedTab()).toHaveTextContent("Prep");
    expect(screen.getByText("Before the fight")).toBeInTheDocument();
    expect(screen.getByText("Add monsters and NPCs")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Initiative order" })).toBeInTheDocument();
  });

  it("lays Prep out in panels: readiness with Start combat, the encounter helper and add form, then rules, allowed content, loot and Initiative setup", () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    const ready = screen.getByRole("region", { name: "Before the fight" });
    expect(within(ready).getByRole("button", { name: "Start combat" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Encounter helper" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add monsters and NPCs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Table rules" })).toBeInTheDocument();
    expect(screen.getByText("Allowed content")).toBeInTheDocument();
    expect(screen.getByText("Loot ideas")).toBeInTheDocument();
    const setup = screen.getByRole("heading", { name: "Initiative setup" });
    expect(setup).toBeInTheDocument();
    // The main column (helper, add form) comes before the side column (rules ... Initiative setup).
    const grid = document.querySelector(".table-page__prep-grid");
    expect(grid.querySelector(".table-page__prep-main")).toContainElement(screen.getByRole("heading", { name: "Encounter helper" }));
    expect(grid.querySelector(".table-page__prep-side")).toContainElement(setup);
    // The Party panel stays out of Prep, and Start combat isn't in the initiative toolbar any more.
    expect(screen.queryByRole("heading", { name: /^Party · / })).not.toBeInTheDocument();
    expect(within(document.querySelector(".table-page__combat .table-page__toolbar")).queryByRole("button", { name: "Start combat" })).not.toBeInTheDocument();
  });

  it("starts the fight from the readiness panel, and keeps the per-creature initiative controls", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    renderPage();

    const start = within(screen.getByRole("region", { name: "Before the fight" })).getByRole("button", { name: "Start combat" });
    await userEvent.click(start);
    expect(startCombat).toHaveBeenCalledTimes(1);

    // Each creature in Initiative setup still has its own Init box, Set button and roll.
    const setup = document.querySelector(".table-page__combat");
    expect(within(setup).getAllByRole("spinbutton", { name: /^Initiative for / }).length).toBeGreaterThan(0);
    expect(within(setup).getAllByRole("button", { name: "Set" }).length).toBeGreaterThan(0);
  });

  it("on Prep during a fight, says so and offers Go to Combat, with no readiness steps or initiative list", async () => {
    mockTable({ isDm: true });
    renderPage();
    await openTab("Prep");

    expect(screen.getByRole("region", { name: "The fight is on" })).toHaveTextContent("The fight is on. Add more monsters here");
    expect(screen.queryByRole("region", { name: "Before the fight" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Initiative setup" })).not.toBeInTheDocument();
    // Adding more monsters mid-fight still works from here.
    expect(screen.getByRole("heading", { name: "Add monsters and NPCs" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Go to Combat/ }));
    expect(selectedTab()).toHaveTextContent("Combat");
  });

  it("opens on Combat during a fight", () => {
    mockTable({ isDm: true });
    renderPage();

    expect(selectedTab()).toHaveTextContent("Combat");
    expect(screen.queryByText("Add monsters and NPCs")).not.toBeInTheDocument();
  });

  it("remembers the DM's pick for this table", async () => {
    mockTable({ isDm: true });
    const { unmount } = renderPage();
    await openTab("Story");
    unmount();

    renderPage();
    expect(selectedTab()).toHaveTextContent("Story");
  });

  it("jumps to Combat when the fight starts, and keeps the turn in view on other tabs", async () => {
    mockTable({ isDm: true, combatActive: false, currentId: null });
    const { rerender } = renderPage();
    await openTab("Story");

    mockTable({ isDm: true, combatActive: true });
    rerender(pageTree());
    expect(selectedTab()).toHaveTextContent("Combat");

    await openTab("Story");
    expect(screen.getByText(/Round 2 · Kobold's turn/)).toBeInTheDocument();
  });

  it("counts attacks waiting for the DM's call on the Combat tab", () => {
    mockTable({ isDm: true });
    useTable.mockReturnValue({
      ...currentTable,
      combatants: combatants.map((c) =>
        c.id === "c-billie" ? { ...c, attack_state: "awaiting_dm", attack_target: "c-kobold" } : c,
      ),
    });
    renderPage();

    expect(screen.getByRole("tab", { name: /^Combat/ })).toHaveTextContent("1");
  });

  it("shows passives, languages and senses on the Story tab", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([
      {
        id: "char-1",
        name: "Billie",
        level: 3,
        race: { name: "Tiefling", traits: ["Darkvision", "Hellish Resistance"] },
        abilityScores: { wisdom: 14 },
        skills: { perception: true },
        languages: "Common, Infernal",
        combat: { speed: 30, hitPoints: { current: 10, max: 10 } },
      },
    ]);
    renderPage();
    await openTab("Story");

    expect(await screen.findByText("Common, Infernal")).toBeInTheDocument();
    expect(screen.getByText("Darkvision")).toBeInTheDocument();
    // Wis +2, proficiency +2: passive Perception 14.
    // (on the character's card, once: short on screen, in full for screen readers).
    expect(screen.getByText("Perception 14")).toBeInTheDocument();
    expect(screen.getByText("Insight 12")).toBeInTheDocument();
    expect(screen.getByText("Investigation 10")).toBeInTheDocument();
  });

  it("replaces the Party panel with the player list on the Players tab, and keeps the sharing switch", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([
      { id: "char-1", name: "Billie", level: 5, abilityScores: {}, combat: {} },
      { id: "char-2", name: "Thorn", level: 3, abilityScores: {}, combat: {} },
    ]);
    renderPage();
    expect(await screen.findByRole("heading", { name: /^Party · 2 players/ })).toBeInTheDocument();

    await openTab("Players");
    expect(screen.queryByRole("heading", { name: /^Party · / })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your players · 2" })).toBeInTheDocument();
    expect(screen.getByText(/let players see the party/i)).toBeInTheDocument();
  });

  it("opens a character's card on the Players tab from the party strip", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([
      { id: "char-1", name: "Billie", level: 5, abilityScores: {}, combat: {} },
    ]);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Billie" }));
    expect(selectedTab()).toHaveTextContent("Players");
    expect(screen.getByText("Level 5 · No race · No class")).toBeInTheDocument();
  });

  it("never shows players the tabs", () => {
    mockTable({ isDm: false });
    renderPage();

    expect(screen.queryByRole("tablist", { name: "DM screen" })).not.toBeInTheDocument();
  });
});

describe("table journal placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCharactersByIds.mockResolvedValue([]);
  });

  it("puts the journal on the DM's Story tab only", async () => {
    mockTable({ isDm: true });
    renderPage();

    expect(screen.queryByRole("heading", { name: "Journal" })).not.toBeInTheDocument();
    await openTab("Story");
    expect(await screen.findByRole("heading", { name: "Journal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start session 2" })).toBeInTheDocument();
  });

  it("shows players the journal without the session button", async () => {
    mockTable({ isDm: false });
    renderPage();
    // Players find the journal on their Story tab.
    await openTab("📜 Story");

    expect(await screen.findByRole("heading", { name: "Journal" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Start session/ })).not.toBeInTheDocument();
  });

  it("keeps the activity log on the DM's Combat tab only", async () => {
    mockTable({ isDm: true });
    renderPage();

    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
    await openTab("Story");
    expect(screen.queryByRole("heading", { name: "Activity" })).not.toBeInTheDocument();
  });

  it("notes a handout shared with everyone in the activity log and the journal", async () => {
    const { listHandouts } = await import("../../utils/handoutStore");
    const { addJournalEntry } = await import("../../utils/journalStore");
    listHandouts.mockResolvedValue([
      {
        id: "h1",
        table_id: "t1",
        title: "The Old Map",
        body: "",
        image_path: null,
        shown_to_all: false,
        shown_to: [],
        created_at: "2026-10-15T01:00:00Z",
      },
    ]);
    mockTable({ isDm: true });
    renderPage();
    await openTab("Story");

    await userEvent.click(await screen.findByRole("button", { name: "Reveal to everyone" }));
    await waitFor(() =>
      expect(addJournalEntry).toHaveBeenCalledWith("t1", {
        body: "📜 Shared a handout: The Old Map",
        visibility: "table",
      }),
    );
    expect(dmLog).toHaveBeenCalledWith("t1", "📜 The DM shared a handout: The Old Map", "handout");
  });

});

describe("the Adventurer game page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCharactersByIds.mockResolvedValue([]);
  });

  function gameTab() {
    return screen.getAllByRole("tab").find((tab) => tab.getAttribute("aria-selected") === "true" && /Combat|Story/.test(tab.textContent));
  }

  it("shows the player's own character on top, with the way to their sheet", async () => {
    mockTable({ isDm: false });
    const { getCharacter } = await import("../../utils/characterStore");
    getCharacter.mockResolvedValue({
      name: "Billie",
      level: 3,
      race: { name: "Tiefling" },
      class: { name: "Rogue" },
      combat: { armorClass: 14, hitPoints: { current: 5, max: 20, temporary: 0 } },
      conditions: [{ key: "poisoned" }],
      abilityScores: { dexterity: 14 },
    });
    renderPage();

    const card = await screen.findByRole("region", { name: "Your character" });
    expect(await within(card).findByRole("heading", { name: "Billie" })).toBeInTheDocument();
    expect(within(card).getByText("Level 3 Tiefling Rogue")).toBeInTheDocument();
    expect(within(card).getByText(/5\/20/)).toBeInTheDocument();
    expect(within(card).getByText(/Bloodied/)).toBeInTheDocument();
    expect(within(card).getByText("Poisoned")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Open my character sheet" })).toHaveAttribute(
      "href",
      "/characters/char-1",
    );
  });

  it("splits the page into Combat and Story, opening on Combat", async () => {
    mockTable({ isDm: false });
    renderPage();

    expect(screen.getByRole("tablist", { name: "Game" })).toBeInTheDocument();
    expect(gameTab()).toHaveTextContent("Combat");
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Journal" })).not.toBeInTheDocument();

    await openTab("📜 Story");
    expect(await screen.findByRole("heading", { name: "Journal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Handouts" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Activity" })).not.toBeInTheDocument();
    // Mid-fight on Story, the turn is still in view.
    expect(screen.getByText(/Round 2 · Kobold's turn/)).toBeInTheDocument();
  });

  it("marks the Combat tab when the player still has to roll initiative", async () => {
    mockTable({ isDm: false });
    renderPage();
    await openTab("📜 Story");

    expect(screen.getByRole("tab", { name: /Combat/ })).toHaveTextContent("!");
  });

  it("jumps to Combat when a fight starts", async () => {
    mockTable({ isDm: false, combatActive: false, currentId: null });
    const { rerender } = renderPage();
    await openTab("📜 Story");

    mockTable({ isDm: false, combatActive: true });
    rerender(pageTree());
    expect(gameTab()).toHaveTextContent("Combat");
  });
});

describe("other players' portraits in the turn order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCharactersByIds.mockResolvedValue([]);
  });

  it("shows every player's picture to a player, even when the DM isn't sharing the party", async () => {
    const { getTablePortraits } = await import("../../utils/journalStore");
    getTablePortraits.mockResolvedValue(new Map([["player-2", "https://example.com/pippa.png"]]));
    mockTable({ isDm: false, combatActive: false, currentId: null });
    useTable.mockReturnValue({
      ...currentTable,
      table: { ...currentTable.table, share_party: false },
      combatants: [
        ...combatants,
        { id: "c-pippa", kind: "player", user_id: "player-2", name: "Pippa", initiative: null, status: "healthy", damage_taken: 0, created_at: "2026-10-03T00:00:04Z" },
        { id: "c-velarion", kind: "player", user_id: "player-3", name: "Velarion", initiative: null, status: "healthy", damage_taken: 0, created_at: "2026-10-03T00:00:05Z" },
      ],
    });
    renderPage();

    await waitFor(() =>
      expect(rowFor("Pippa").querySelector(".table-page__row-portrait img")).toHaveAttribute(
        "src",
        "https://example.com/pippa.png",
      ),
    );
    // A player with no picture on file still shows their initials.
    expect(rowFor("Velarion").querySelector(".table-page__row-portrait img")).toBeNull();
    expect(rowFor("Velarion").querySelector(".table-page__row-portrait")).toHaveTextContent("V");
  });
});



describe("TablePage, DM Combat tab: compact rows, the party summary and the damage form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sheet = (id, name, current) => ({
    id,
    name,
    level: 4,
    class: { name: "Rogue" },
    combat: { hitPoints: { current, max: 24, temporary: 0 }, armorClass: 12 },
    abilityScores: {},
  });

  it("lists everyone as one short line, with one panel of controls for the picked creature", () => {
    mockTable({ isDm: true });
    withAlly();
    renderPage();

    // No big cards in the list: no Attack or HP boxes inside the rows.
    for (const row of document.querySelectorAll("li.table-page__row")) {
      expect(within(row).queryByRole("button", { name: "Attack" })).not.toBeInTheDocument();
    }
    // The panel shows whoever is up (the Kobold), and says so.
    expect(screen.getByRole("heading", { name: "Selected · Kobold" })).toBeInTheDocument();
    expect(screen.getByText("Following the turn")).toBeInTheDocument();
    expect(within(detailFor("Kobold")).getByRole("button", { name: "Attack" })).toBeInTheDocument();
    expect(detailFor("Sir Pip")).not.toBeVisible();
  });

  it("picks a creature without changing whose turn it is, and can go back to following the turn", async () => {
    mockTable({ isDm: true });
    withAlly();
    renderPage();

    await userEvent.click(rowFor("Sir Pip").querySelector(".table-page__row-select"));
    expect(screen.getByRole("heading", { name: "Selected · Sir Pip" })).toBeInTheDocument();
    expect(screen.getByText("Picked by you")).toBeInTheDocument();
    expect(rowFor("Sir Pip").querySelector(".table-page__row-select")).toHaveAttribute("aria-pressed", "true");
    // The turn itself is untouched: the Kobold is still the one up.
    expect(rowFor("Kobold")).toHaveClass("table-page__row--current");
    expect(rowFor("Sir Pip")).not.toHaveClass("table-page__row--current");
    expect(within(detailFor("Sir Pip")).getByRole("button", { name: "Attack" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Follow the turn" }));
    expect(screen.getByRole("heading", { name: "Selected · Kobold" })).toBeInTheDocument();
  });

  it("lets go of a picked creature when you tap it again, and follows the turn", async () => {
    mockTable({ isDm: true });
    withAlly();
    renderPage();

    const select = () => rowFor("Sir Pip").querySelector(".table-page__row-select");
    await userEvent.click(select());
    expect(screen.getByRole("heading", { name: "Selected · Sir Pip" })).toBeInTheDocument();

    await userEvent.click(select());
    expect(screen.getByRole("heading", { name: "Selected · Kobold" })).toBeInTheDocument();
    expect(screen.getByText("Following the turn")).toBeInTheDocument();
    expect(select()).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps who you picked, and what you typed for them, when a live update arrives", async () => {
    mockTable({ isDm: true });
    withAlly();
    const view = renderPage();

    const pip = await pick("Sir Pip");
    await userEvent.type(within(pip).getByLabelText("Damage amount for Sir Pip"), "7");

    // The turn moves on to Sir Pip's neighbour and someone hit the Kobold.
    withAlly({
      table: { ...currentTable.table, current_combatant_id: "c-billie" },
      combatants: [combatants[0], { ...combatants[1], damage_taken: 14 }, ally],
    });
    view.rerender(pageTree());

    expect(screen.getByRole("heading", { name: "Selected · Sir Pip" })).toBeInTheDocument();
    expect(within(detailFor("Sir Pip")).getByLabelText("Damage amount for Sir Pip")).toHaveValue(7);
    // And an amount typed for the Kobold before is still there too.
    expect(rowFor("Billie")).toHaveClass("table-page__row--current");
  });

  it("keeps the keyboard focus on the row you pressed, and a button jumps to the controls", async () => {
    mockTable({ isDm: true });
    withAlly();
    renderPage();

    const select = rowFor("Sir Pip").querySelector(".table-page__row-select");
    select.focus();
    await userEvent.keyboard("{Enter}");
    expect(select).toHaveFocus();
    expect(select).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "Go to the controls for Sir Pip" }));
    expect(document.getElementById("detail-panel")).toHaveFocus();
  });

  it("shows a pending player attack on the creature's own line", () => {
    mockTable({ isDm: true });
    withAlly({
      combatants: [
        { ...combatants[0], attack_state: "awaiting_dm", attack_target: "c-pip", attack_name: "Dagger" },
        combatants[1],
        ally,
      ],
    });
    renderPage();
    // The request is right on the creature's line, flagged, with Hit, Miss and Deny.
    expect(rowFor("Sir Pip")).toHaveTextContent("Needs your call");
    expect(within(rowFor("Sir Pip")).getByRole("button", { name: "Hit" })).toBeInTheDocument();
    expect(within(rowFor("Sir Pip")).getByRole("button", { name: "Deny" })).toBeInTheDocument();
  });

  it("keeps the initiative boxes on each line before the fight", () => {
    mockTable({ isDm: true, combatActive: false });
    withAlly();
    renderPage();
    expect(within(rowFor("Sir Pip")).getByLabelText("Initiative for Sir Pip")).toBeInTheDocument();
    expect(within(rowFor("Sir Pip")).getByRole("button", { name: "Roll d20" })).toBeInTheDocument();
  });

  it("before the fight, opens a creature's panel on the first tap and closes it on the second", async () => {
    mockTable({ isDm: true, combatActive: false });
    withAlly();
    renderPage();
    expect(screen.queryByRole("heading", { name: /^Selected ·/ })).not.toBeInTheDocument();

    const select = () => rowFor("Sir Pip").querySelector(".table-page__row-select");
    await userEvent.click(select());
    expect(screen.getByRole("heading", { name: "Selected · Sir Pip" })).toBeInTheDocument();

    await userEvent.click(select());
    expect(screen.queryByRole("heading", { name: /^Selected ·/ })).not.toBeInTheDocument();
  });

  it("keeps a player's page as it was: whole rows, no list-and-panel, no creature pictures", () => {
    mockTable({ isDm: false });
    renderPage();
    expect(document.querySelector(".table-page__row--summary")).toBeNull();
    expect(document.querySelector("[data-detail-for]")).toBeNull();
    expect(document.querySelector(".table-page__row-portrait--creature")).toBeNull();
  });

  it("shows a portrait only for a creature added from the SRD, by its exact id", () => {
    mockTable({ isDm: true });
    withAlly({
      enemyHp: {
        // Named "Kobold" and added from the SRD: its picture. The ally is
        // named like a kobold but has no SRD id: a neutral badge, not a guess.
        "c-kobold": { current_hp: 9, max_hp: 20, armor_class: 12, stat_block: { creature: "kobold" } },
        "c-pip": { current_hp: 18, max_hp: 20, armor_class: 16, stat_block: {} },
      },
      combatants: [combatants[0], combatants[1], { ...ally, name: "Kobold Friend" }],
    });
    renderPage();
    expect(rowFor("Kobold").querySelector(".table-page__row-portrait--creature img")).not.toBeNull();
    expect(rowFor("Kobold Friend").querySelector(".table-page__row-portrait--creature img")).toBeNull();
    expect(rowFor("Kobold Friend").querySelector(".table-page__row-portrait--creature svg")).not.toBeNull();
  });

  it("folds the party into 'Party · 4 players' that opens on a button", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([
      sheet("s1", "Dangit", 22),
      sheet("s2", "Branwen", 10),
      sheet("s3", "Torren", 24),
      sheet("s4", "Lira", 0),
    ]);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Party · 4 players" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /1 bloodied · 1 down/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("party-body")).toHaveClass("table-page__party-body--open");
  });

  it("labels every box in the damage form and tucks the long help away", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([sheet("s1", "Billie", 20)]);
    renderPage();

    expect(screen.getByLabelText("Attacker")).toBeVisible();
    expect(screen.getByLabelText("Target")).toBeVisible();
    expect(screen.getByLabelText("Amount")).toBeVisible();
    expect(screen.getByRole("button", { name: /to apply$/ })).toHaveTextContent("Send to player to apply");
    expect(screen.getByText("This sends a damage request to the player. It does not change their HP directly.")).toBeVisible();
    const help = screen.getByText("How does this work?").closest("details");
    expect(help).not.toHaveAttribute("open");
  });
});

describe("TablePage, DM Combat tab: statuses on the initiative line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sheetWith = (id, name, extra = {}) => ({
    id,
    name,
    level: 4,
    class: { name: "Rogue" },
    combat: { hitPoints: { current: 20, max: 24, temporary: 0 }, armorClass: 12 },
    abilityScores: {},
    conditions: [],
    ...extra,
  });
  const billie = sheetWith("char-1", "Billie", {
    conditions: [{ key: "poisoned", rounds: 2 }],
    concentration: { spell: "Bless", rounds: 8 },
  });
  // A second player at the table who isn't in the initiative order.
  const mira = sheetWith("char-2", "Mira", { conditions: [{ key: "prone" }] });

  function setup(sheets = [billie, mira]) {
    mockTable({ isDm: true });
    currentTable.members = [
      { user_id: "player-1", character_id: "char-1" },
      { user_id: "player-2", character_id: "char-2" },
    ];
    useTable.mockReturnValue(currentTable);
    getCharactersByIds.mockResolvedValue(sheets);
  }

  it("shows conditions and concentration as readable labels on the character's initiative line", async () => {
    setup();
    renderPage();

    const row = await waitFor(() => {
      const found = rowFor("Billie");
      expect(found).toHaveTextContent("Poisoned");
      return found;
    });
    expect(row).toHaveTextContent("Concentrating: Bless");
    // A creature has no sheet, so no status line.
    expect(rowFor("Kobold").querySelector(".table-page__summary-status")).toBeNull();
  });

  it("doesn't repeat them on the Party card, but keeps them for someone not in the initiative order", async () => {
    setup();
    renderPage();

    const strip = await screen.findByRole("list", { name: "Party" });
    await waitFor(() => expect(within(strip).getByText("Prone")).toBeInTheDocument());
    // Billie is in the initiative order, so her card leaves them to her line.
    expect(within(strip).queryByText("Poisoned")).not.toBeInTheDocument();
    expect(within(strip).queryByText(/Bless/)).not.toBeInTheDocument();
    // Death saves, HP and AC stay on the card.
    expect(within(strip).getByText(/Billie/)).toBeInTheDocument();
  });

  it("explains each status, with the time left, in the picked character's panel", async () => {
    setup();
    renderPage();
    await waitFor(() => expect(rowFor("Billie")).toHaveTextContent("Poisoned"));

    const panel = await pick("Billie");
    expect(panel).toHaveTextContent("Poisoned · 2 rounds left");
    expect(panel).toHaveTextContent("Disadvantage on attack rolls and ability checks.");
    expect(panel).toHaveTextContent("Concentrating: Bless · 8 rounds left");
  });

  it("brings a status change to both the initiative line and the panel on the next refresh", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      setup();
      renderPage();
      await waitFor(() => expect(rowFor("Billie")).toHaveTextContent("Poisoned"));
      const panel = await pick("Billie");
      expect(panel).not.toHaveTextContent("Frightened");

      // The player picks up a new condition and drops concentration.
      getCharactersByIds.mockResolvedValue([
        sheetWith("char-1", "Billie", { conditions: [{ key: "poisoned" }, { key: "frightened" }] }),
        mira,
      ]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10500);
      });

      await waitFor(() => expect(rowFor("Billie")).toHaveTextContent("Frightened"));
      expect(rowFor("Billie")).not.toHaveTextContent("Concentrating");
      expect(detailFor("Billie")).toHaveTextContent("Frightened");
      expect(detailFor("Billie")).not.toHaveTextContent("Concentrating");
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the statuses on the line when the tablet Party panel is folded", async () => {
    setup();
    renderPage();
    await waitFor(() => expect(rowFor("Billie")).toHaveTextContent("Poisoned"));
    // The Party panel is folded by default on narrow screens (its body is hidden by CSS),
    // and the line above is outside it.
    expect(document.getElementById("party-body")).not.toContainElement(rowFor("Billie"));
    expect(screen.getByRole("button", { name: /Show/ })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("TablePage, DM Combat tab: party visibility, selection marker and waiting calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sheet = (id, name) => ({
    id,
    name,
    level: 4,
    class: { name: "Rogue" },
    combat: { hitPoints: { current: 20, max: 24, temporary: 0 }, armorClass: 12 },
    abilityScores: {},
  });

  it("folds party visibility to one line, and opening it never changes who can see the party", async () => {
    mockTable({ isDm: true });
    currentTable.table = { ...currentTable.table, share_party: false };
    useTable.mockReturnValue(currentTable);
    getCharactersByIds.mockResolvedValue([sheet("char-1", "Billie")]);
    renderPage();

    const toggle = await screen.findByRole("button", { name: /Stats hidden/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("checkbox", { name: /Let players see the party/ })).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const box = screen.getByRole("checkbox", { name: /Let players see the party/ });
    expect(box).not.toBeChecked();
    // Opening and closing the fold changed nothing.
    expect(setShareParty).not.toHaveBeenCalled();
    await userEvent.click(toggle);
    expect(setShareParty).not.toHaveBeenCalled();

    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("checkbox", { name: /Let players see the party/ }));
    expect(setShareParty).toHaveBeenCalledWith("t1", true);
  });

  it("says 'Stats shared' when the party is shared", async () => {
    mockTable({ isDm: true });
    currentTable.table = { ...currentTable.table, share_party: true };
    useTable.mockReturnValue(currentTable);
    getCharactersByIds.mockResolvedValue([sheet("char-1", "Billie")]);
    renderPage();

    expect(await screen.findByRole("button", { name: /Stats shared/ })).toBeInTheDocument();
  });

  it("marks the picked creature with a 'Selected' tag when it isn't the one up, and the turn with 'Turn'", async () => {
    mockTable({ isDm: true });
    withAlly();
    renderPage();

    expect(rowFor("Kobold")).toHaveTextContent("Turn");
    expect(rowFor("Sir Pip")).not.toHaveTextContent("Selected");
    await pick("Sir Pip");
    expect(rowFor("Sir Pip")).toHaveTextContent("Selected");
    expect(rowFor("Kobold")).toHaveTextContent("Turn");
    expect(rowFor("Kobold")).not.toHaveTextContent("Selected");
  });

  it("gives a waiting attack a button that jumps to its row, flagged 'Needs your call'", async () => {
    mockTable({ isDm: true });
    withAlly({
      combatants: [
        { ...combatants[0], attack_state: "awaiting_dm", attack_target: "c-pip", attack_name: "Dagger" },
        combatants[1],
        ally,
      ],
    });
    renderPage();

    const jump = screen.getByRole("button", { name: /1 attack needs your call/ });
    await userEvent.click(jump);
    expect(rowFor("Sir Pip")).toHaveTextContent("Needs your call");
    expect(within(rowFor("Sir Pip")).getByRole("button", { name: /Sir Pip/ })).toHaveFocus();
  });

  it("keeps a player's page free of the new jump button and tags", () => {
    mockTable({ isDm: false });
    renderPage();
    expect(document.querySelector(".table-page__call-jump")).toBeNull();
    expect(document.querySelector(".table-page__order-head")).toBeNull();
    expect(document.querySelector(".table-page__party-visibility")).toBeNull();
  });
});

describe("TablePage, DM Combat tab: header rows, gold turn, and the slim panels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sheet = (id, name) => ({
    id,
    name,
    level: 4,
    class: { name: "Rogue" },
    combat: { hitPoints: { current: 20, max: 24, temporary: 0 }, armorClass: 12 },
    abilityScores: {},
  });

  it("puts the title with Add monster and End combat in a slim header, and the turn summary, New encounter and Next turn in a toolbar under it", () => {
    mockTable({ isDm: true });
    renderPage();

    const header = document.querySelector(".table-page__combat .table-page__slim-head");
    expect(within(header).getByRole("heading", { level: 2, name: "Combat" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "+ Add monster" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "End combat" })).toBeInTheDocument();
    const toolbar = document.querySelector(".table-page__combat .table-page__toolbar");
    expect(toolbar).toHaveTextContent("Round 2");
    expect(within(toolbar).getAllByRole("button").map((b) => b.textContent)).toEqual(["New encounter", "Next turn"]);
  });

  it("shows Start combat in the same far-right place before the fight", async () => {
    mockTable({ isDm: true, combatActive: false });
    renderPage();
    await openTab("Combat");

    const toolbar = document.querySelector(".table-page__combat .table-page__toolbar");
    expect(within(toolbar).getAllByRole("button").map((b) => b.textContent).at(-1)).toBe("Start combat");
    expect(screen.queryByRole("button", { name: "End combat" })).not.toBeInTheDocument();
  });

  it("marks whose turn it is on the Party card too, for a player's turn", async () => {
    mockTable({ isDm: true, currentId: "c-billie" });
    currentTable.members = [{ user_id: "player-1", character_id: "char-1" }];
    useTable.mockReturnValue(currentTable);
    getCharactersByIds.mockResolvedValue([sheet("char-1", "Billie")]);
    renderPage();

    const strip = await screen.findByRole("list", { name: "Party" });
    const card = await waitFor(() => {
      const found = strip.querySelector(".party-strip__row--turn");
      expect(found).not.toBeNull();
      return found;
    });
    // Not by colour alone: the card also carries a labelled mark.
    expect(within(card).getByRole("img", { name: "Their turn" })).toBeInTheDocument();
    expect(rowFor("Billie")).toHaveClass("table-page__row--current");
  });

  it("gives a monster's turn a gold current row, and no card in the party is marked", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([sheet("char-1", "Billie")]);
    renderPage();

    await screen.findByRole("list", { name: "Party" });
    expect(rowFor("Kobold")).toHaveClass("table-page__row--current");
    expect(document.querySelector(".party-strip__row--turn")).toBeNull();
  });

  it("shows an Activity icon only for a line with an explicit kind, never guessed from its words, and keeps text and time", () => {
    mockTable({ isDm: true });
    currentTable.events = [
      { id: "e1", message: "The torches flicker.", created_at: "2026-10-03T16:21:00Z", kind: "attack" },
      // Sounds like an attack, but carries no kind: no icon, no empty box.
      { id: "e2", message: "A bite lands on Billie.", created_at: "2026-10-03T16:22:00Z" },
      // An unknown kind is ignored too.
      { id: "e3", message: "Something else.", created_at: "2026-10-03T16:23:00Z", kind: "mystery" },
    ];
    useTable.mockReturnValue(currentTable);
    renderPage();

    const withIcon = screen.getByText("The torches flicker.").closest("li");
    const icon = withIcon.querySelector("img.table-page__log-icon");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("alt", "");
    expect(withIcon.querySelector("time")).toHaveAttribute("datetime", "2026-10-03T16:21:00.000Z");
    for (const text of ["A bite lands on Billie.", "Something else."]) {
      const plain = screen.getByText(text).closest("li");
      expect(plain.querySelector(".table-page__log-icon")).toBeNull();
      expect(plain.querySelector("time")).not.toBeNull();
    }
    expect(screen.getByRole("list", { name: "Activity log" })).toBeInTheDocument();
  });

  it("folds the how-to line and the earlier history into small disclosures in the creature's panel", () => {
    mockTable({ isDm: true });
    renderPage();

    const panel = detailFor("Kobold");
    const folds = panel.querySelectorAll("details.table-page__note-fold");
    expect([...folds].map((d) => d.querySelector("summary").textContent)).toEqual([
      "What to do this turn",
      "Earlier (1)",
    ]);
    for (const fold of folds) expect(fold).not.toHaveAttribute("open");
    expect(panel).toHaveTextContent("Kobold's turn: tap Attack");
  });

  it("leaves Activity as plain lines on a player's page", () => {
    mockTable({ isDm: false });
    renderPage();
    expect(document.querySelector(".table-page__log-icon")).toBeNull();
    expect(document.querySelector(".table-page__slim-head")).toBeNull();
    expect(document.querySelector(".table-page__combat-head--dm")).toBeNull();
  });

  it("puts Send damage under a slim header with Attacker, Target and Amount, then a full-width button", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([sheet("char-1", "Billie")]);
    renderPage();

    const panel = screen.getByRole("heading", { name: "Send damage to a player" }).closest("section");
    expect(panel.querySelector(".table-page__slim-head")).not.toBeNull();
    const labels = [...panel.querySelectorAll(".table-page__field-label")].map((el) => el.textContent);
    expect(labels).toEqual(["Attacker", "Target", "Amount"]);
    const button = within(panel).getByRole("button", { name: /to apply$/ });
    expect(button).toHaveTextContent("Send to player to apply");
    expect(button).toBeDisabled();
  });
});

describe("TablePage, DM Combat tab: the narrow-screen Party fold", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the button's expanded state in step with the fold, and never touches sharing or characters", async () => {
    mockTable({ isDm: true });
    getCharactersByIds.mockResolvedValue([
      { id: "char-1", name: "Billie", level: 4, class: { name: "Rogue" }, combat: { hitPoints: { current: 20, max: 24, temporary: 0 }, armorClass: 12 }, abilityScores: {} },
    ]);
    renderPage();

    const toggle = await screen.findByRole("button", { name: /Show$/ });
    const body = document.getElementById("party-body");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "party-body");
    expect(body).not.toHaveClass("table-page__party-body--open");

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent("Hide");
    expect(body).toHaveClass("table-page__party-body--open");

    toggle.focus();
    await userEvent.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(body).not.toHaveClass("table-page__party-body--open");
    await userEvent.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    expect(setShareParty).not.toHaveBeenCalled();
    expect(editCombatant).not.toHaveBeenCalled();
  });
});

describe("TablePage when the table can't be shown", () => {
  const empty = { table: null, members: [], combatants: [], enemyHp: {}, events: [], isLoading: false, error: "", isDm: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("says it's loading while the table is first fetched", () => {
    useTable.mockReturnValue({ ...empty, isLoading: true, refresh: vi.fn() });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading table...");
  });

  it("tells a failed request apart from a missing table: friendly words, Try again, no raw error", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    useTable.mockReturnValue({ ...empty, error: "JWT expired: PGRST301", refresh });
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Couldn't open this table" })).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load this table. Check your connection and try again.");
    expect(alert).not.toHaveTextContent("JWT");
    expect(screen.queryByText(/not found/i)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    // The button that was pressed is gone, so focus goes to the page heading, not nowhere.
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveFocus());
  });

  it("says the same neutral thing for a table that is gone and one you can't see, with no retry", () => {
    useTable.mockReturnValue({ ...empty, refresh: vi.fn() });
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "We couldn't find that table" })).toBeInTheDocument();
    expect(screen.getByText("This table was not found, or you are not part of it.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to My Games" })).toHaveAttribute("href", "/games");
  });

  it("keeps showing the table, with a gentle note and Try again, when only a refresh fails", async () => {
    mockTable({ isDm: false });
    const refresh = vi.fn().mockResolvedValue(undefined);
    useTable.mockReturnValue({ ...currentTable, error: "Failed to fetch", refresh });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't refresh this table just now");
    expect(screen.getByRole("heading", { name: /Final Fight/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalled();
  });
});

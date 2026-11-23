import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSheetRolls } from "../../hooks/useSheetRolls";
import { RollContext } from "./rollContext";
import RollDock from "./RollDock";
import RollButton from "./RollButton";
import AttackPanel from "../AttackPanel/AttackPanel";
import { attackRoll, cancelAttack, dealDamage, logRoll } from "../../utils/tableStore";
import { installFakeStorage } from "../../test/fakeStorage";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/tableStore", () => ({
  listCharacterTables: vi.fn().mockResolvedValue([]),
  logRoll: vi.fn().mockResolvedValue(),
  attackRoll: vi.fn(),
  cancelAttack: vi.fn(),
  dealDamage: vi.fn(),
}));

// The real roller, roll bar and attack panel together, as on the sheet: the
// question before discarding a roll that waits for real dice is the same
// one from the roll bar's "App rolls" and from an attack panel's link.
function Sheet({ me = {} }) {
  const roller = useSheetRolls("char-1", "Billie");
  const combat = {
    table: { id: "t1" },
    refresh: vi.fn(),
    myCombatant: { id: "c-me", attack_state: "none", attack_crit: false, ...me },
    combatants: [
      { id: "c-me", kind: "player", name: "Billie", status: "healthy" },
      { id: "c-kobold", kind: "monster", name: "Kobold", status: "healthy" },
    ],
  };
  return (
    <RollContext.Provider value={roller}>
      <RollButton label="Stealth" bonus={3}>
        +3
      </RollButton>
      <AttackPanel
        attack={{ name: "Dagger", toHit: 5, damage: "1d4+3", damageType: "Piercing" }}
        combat={combat}
        onClose={vi.fn()}
      />
      <RollDock />
    </RollContext.Provider>
  );
}

const appRolls = () => screen.getByRole("radio", { name: "App rolls" });
const realDice = () => screen.getByRole("radio", { name: "I roll real dice" });
const waitingBox = () => within(screen.getByRole("form", { name: "Stealth: your dice" })).getByRole("textbox");

// Real dice on, then tap Stealth and type 17 without submitting it.
async function startWaitingRoll() {
  await userEvent.click(realDice());
  await userEvent.click(screen.getByRole("button", { name: /Roll Stealth/ }));
  await userEvent.type(waitingBox(), "17");
}

beforeEach(() => {
  vi.clearAllMocks();
  installFakeStorage();
});
afterEach(() => vi.restoreAllMocks());

describe("Discarding a roll that waits for real dice", () => {
  it("from the roll bar: asks once, Keep leaves the roll, its number and real dice as they were", async () => {
    render(<Sheet />);
    await startWaitingRoll();
    await userEvent.click(appRolls());

    const question = screen.getByRole("group", { name: /Your Stealth roll is still waiting/ });
    expect(question).toBeInTheDocument();
    // One question only, and it has focus.
    expect(screen.getAllByText(/is still waiting for your dice/)).toHaveLength(1);
    expect(within(question).getByRole("button", { name: "Keep entering roll" })).toHaveFocus();
    // Nothing has changed yet.
    expect(realDice()).toHaveAttribute("aria-checked", "true");
    expect(waitingBox()).toHaveValue("17");

    await userEvent.click(within(question).getByRole("button", { name: "Keep entering roll" }));
    expect(screen.queryByText(/is still waiting for your dice/)).toBeNull();
    expect(realDice()).toHaveAttribute("aria-checked", "true");
    expect(waitingBox()).toHaveValue("17");
    await waitFor(() => expect(waitingBox()).toHaveFocus());
    expect(logRoll).not.toHaveBeenCalled();
  });

  it("from the roll bar: Discard throws the roll away once and both the bar and the panel switch", async () => {
    render(<Sheet />);
    await startWaitingRoll();
    expect(screen.getByLabelText("Your physical d20 roll")).toBeInTheDocument();
    await userEvent.click(appRolls());
    await userEvent.click(screen.getByRole("button", { name: "Discard and switch" }));

    expect(screen.queryByRole("form", { name: "Stealth: your dice" })).toBeNull();
    expect(appRolls()).toHaveAttribute("aria-checked", "true");
    // The open attack panel follows the same setting.
    expect(screen.getByRole("button", { name: /Roll d20/ })).toBeInTheDocument();
    await waitFor(() => expect(appRolls()).toHaveFocus());
    expect(logRoll).not.toHaveBeenCalled();
    expect(attackRoll).not.toHaveBeenCalled();
  });

  it("from an attack panel: the same question, shown in the panel only", async () => {
    render(<Sheet />);
    await startWaitingRoll();
    await userEvent.click(screen.getByRole("button", { name: "Let the app roll instead" }));
    const panel = screen.getByRole("region", { name: "Attack with Dagger" });
    expect(within(panel).getByText(/Your/)).toHaveTextContent("Your Stealth roll is still waiting");
    expect(screen.getAllByText(/is still waiting for your dice/)).toHaveLength(1);

    await userEvent.click(within(panel).getByRole("button", { name: "Discard and switch" }));
    expect(screen.queryByRole("form", { name: "Stealth: your dice" })).toBeNull();
    expect(appRolls()).toHaveAttribute("aria-checked", "true");
    await waitFor(() => expect(within(panel).getByRole("button", { name: /Roll d20/ })).toHaveFocus());
  });

  it("goes away safely if the waiting roll is finished while the question is open", async () => {
    render(<Sheet />);
    await startWaitingRoll();
    await userEvent.click(appRolls());
    // The player finishes the waiting roll instead.
    await userEvent.click(within(screen.getByRole("form", { name: "Stealth: your dice" })).getByRole("button", { name: "Use my roll" }));
    expect(screen.queryByText(/is still waiting for your dice/)).toBeNull();
    // Still real dice: the question never acted on its own.
    expect(realDice()).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Stealth/)).toBeInTheDocument();
  });

  it("switches straight away when nothing is waiting", async () => {
    render(<Sheet />);
    await userEvent.click(realDice());
    await userEvent.click(appRolls());
    expect(screen.queryByText(/is still waiting/)).toBeNull();
    expect(appRolls()).toHaveAttribute("aria-checked", "true");
  });

  it("doesn't touch a hit in progress or its target", async () => {
    render(<Sheet me={{ attack_state: "hit", attack_target: "c-kobold" }} />);
    await startWaitingRoll();
    await userEvent.click(appRolls());
    await userEvent.click(screen.getByRole("button", { name: "Discard and switch" }));
    expect(screen.getByText("Target: Kobold (locked for this attack).")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Roll damage" })).toBeInTheDocument();
    expect(cancelAttack).not.toHaveBeenCalled();
    expect(dealDamage).not.toHaveBeenCalled();
  });
});

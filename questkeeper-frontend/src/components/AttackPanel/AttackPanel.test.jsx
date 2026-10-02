import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttackPanel from "./AttackPanel";
import { attackRoll, dealDamage } from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

vi.mock("../../utils/tableStore", () => ({
  attackRoll: vi.fn(),
  dealDamage: vi.fn().mockResolvedValue(undefined),
}));

const dagger = { name: "Dagger", toHit: 5, damage: "1d4+3", damageType: "Piercing" };

function makeCombat(meOverrides = {}) {
  return {
    table: { id: "t1" },
    refresh: vi.fn(),
    myCombatant: { id: "c-me", attack_state: "none", attack_crit: false, ...meOverrides },
    combatants: [
      { id: "c-me", kind: "player", name: "Billie", status: "healthy" },
      { id: "c-kobold", kind: "monster", name: "Kobold", status: "healthy" },
      { id: "c-goblin", kind: "monster", name: "Goblin", status: "down" },
    ],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AttackPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dealDamage.mockResolvedValue(undefined);
  });

  it("tells the player which attack of the turn this is", () => {
    const { rerender } = render(
      <AttackPanel attack={dagger} combat={makeCombat()} onClose={vi.fn()} />,
    );
    expect(screen.getByText("Attack 1 this turn")).toBeInTheDocument();

    rerender(
      <AttackPanel
        attack={dagger}
        combat={makeCombat({ attacks_this_turn: 2 })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Attack 3 this turn")).toBeInTheDocument();
  });

  it("keeps the count steady while an attack is still in progress", () => {
    render(
      <AttackPanel
        attack={dagger}
        combat={makeCombat({ attacks_this_turn: 2, attack_state: "hit" })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Attack 2 this turn")).toBeInTheDocument();
  });

  it("only offers enemies that are still standing as targets", () => {
    render(<AttackPanel attack={dagger} combat={makeCombat()} onClose={vi.fn()} />);

    expect(screen.getByRole("option", { name: "Kobold" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Goblin" })).not.toBeInTheDocument();
  });

  it("sends a virtual d20 roll with the attack bonus and shows the result", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
    attackRoll.mockResolvedValue("hit");
    const combat = makeCombat();
    render(<AttackPanel attack={dagger} combat={combat} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(attackRoll).toHaveBeenCalledWith({
      tableId: "t1",
      targetId: "c-kobold",
      attackName: "Dagger",
      natural: 11,
      bonus: 5,
    });
    expect(await screen.findByText(/Rolled 11 \+ 5 = 16\. That hits!/)).toBeInTheDocument();
    expect(combat.refresh).toHaveBeenCalled();
  });

  it("accepts a physical d20 roll and rejects numbers outside 1-20", async () => {
    attackRoll.mockResolvedValue("miss");
    render(<AttackPanel attack={dagger} combat={makeCombat()} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Your physical d20 roll"), "25");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/1 to 20/);
    expect(attackRoll).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Your physical d20 roll"));
    await userEvent.type(screen.getByLabelText("Your physical d20 roll"), "7");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));
    expect(attackRoll).toHaveBeenCalledWith(expect.objectContaining({ natural: 7, bonus: 5 }));
  });

  it("explains when the DM has to call the hit", () => {
    render(
      <AttackPanel
        attack={dagger}
        combat={makeCombat({ attack_state: "awaiting_dm" })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/The DM is deciding/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Roll d20/ })).not.toBeInTheDocument();
  });

  it("after a hit, rolls damage and deals it", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d4 -> 3
    const onClose = vi.fn();
    render(
      <AttackPanel
        attack={dagger}
        combat={makeCombat({ attack_state: "hit" })}
        onClose={onClose}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
    await userEvent.click(screen.getByRole("button", { name: "Deal 6 damage" }));

    expect(dealDamage).toHaveBeenCalledWith("t1", 6);
    expect(onClose).toHaveBeenCalled();
  });

  it("doubles the dice on a critical hit", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d4 -> 3
    render(
      <AttackPanel
        attack={dagger}
        combat={makeCombat({ attack_state: "hit", attack_crit: true })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));

    expect(screen.getByRole("button", { name: "Deal 9 damage" })).toBeInTheDocument();
  });

  it("lets a player enter physical damage, even for damage it cannot parse", async () => {
    render(
      <AttackPanel
        attack={{ ...dagger, damage: "special" }}
        combat={makeCombat({ attack_state: "hit" })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Roll damage" })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Your physical damage total"), "8");
    await userEvent.click(screen.getByRole("button", { name: "Deal my damage" }));

    expect(dealDamage).toHaveBeenCalledWith("t1", 8);
  });

  it("shows the server's error, such as 'It is not your turn'", async () => {
    attackRoll.mockRejectedValue(new Error("It is not your turn"));
    render(<AttackPanel attack={dagger} combat={makeCombat()} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("It is not your turn");
  });
});

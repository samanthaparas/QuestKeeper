import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AttackPanel from "./AttackPanel";
import { attackRoll, dealDamage } from "../../utils/tableStore";
import { installFakeStorage } from "../../test/fakeStorage";

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
    expect(await screen.findByText(/Rolled 11 \+ 5 = 16\./)).toBeInTheDocument();
    expect(combat.refresh).toHaveBeenCalled();
  });

  it("shows 'That misses!' after a miss", async () => {
    attackRoll.mockResolvedValue("miss");
    render(<AttackPanel attack={dagger} combat={makeCombat()} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByText(/That misses!/)).toBeInTheDocument();
  });

  it("moves on from 'waiting' to the damage step once the DM calls it a hit", () => {
    const { rerender } = render(
      <AttackPanel
        attack={dagger}
        combat={makeCombat({ attack_state: "awaiting_dm", attacks_this_turn: 1 })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/The DM is deciding/)).toBeInTheDocument();

    rerender(
      <AttackPanel
        attack={dagger}
        combat={makeCombat({ attack_state: "hit", attacks_this_turn: 1 })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Waiting for the DM to call it/)).not.toBeInTheDocument();
    expect(screen.getByText(/Now roll damage/)).toBeInTheDocument();
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

    // Sent with its type, so the table log (and later resistances) know it.
    expect(dealDamage).toHaveBeenCalledWith("t1", 6, [{ amount: 6, type: "piercing", source: "Dagger" }]);
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

    // A total typed by hand has no breakdown.
    expect(dealDamage).toHaveBeenCalledWith("t1", 8, null);
  });

  it("adds up the dice a player typed, plus the bonus, before dealing the damage", async () => {
    render(
      <AttackPanel
        attack={{ ...dagger, damage: "10d6+4" }}
        combat={makeCombat({ attack_state: "hit" })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.type(
      screen.getByLabelText(/Rolled real dice\? Type the number on each die/),
      "6, 2, 3, 6, 1, 1, 5, 4, 6, 2",
    );
    await userEvent.click(screen.getByRole("button", { name: "Use my dice" }));

    expect(screen.getByText(/= 40/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Deal 40 damage" }));
    expect(dealDamage).toHaveBeenCalledWith("t1", 40, [{ amount: 40, type: "piercing", source: "Dagger" }]);
  });

  it("doubles typed dice on a critical hit and rejects the wrong number of dice", async () => {
    render(
      <AttackPanel
        attack={{ ...dagger, damage: "1d6+3" }}
        combat={makeCombat({ attack_state: "hit", attack_crit: true })}
        onClose={vi.fn()}
      />,
    );
    const box = screen.getByLabelText(/Rolled real dice\? Type the number on each die/);

    await userEvent.type(box, "4, 2");
    await userEvent.click(screen.getByRole("button", { name: "Use my dice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("1d6 needs 1 number, and you typed 2.");

    await userEvent.clear(box);
    await userEvent.type(box, "4");
    await userEvent.click(screen.getByRole("button", { name: "Use my dice" }));
    expect(screen.getByRole("button", { name: "Deal 11 damage" })).toBeInTheDocument();
  });

  it("adds a smite on top of the weapon: weapon dice first, then the smite dice", async () => {
    render(
      <AttackPanel
        attack={{ ...dagger, damage: "2d8+3" }}
        combat={makeCombat({ attack_state: "hit" })}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByLabelText(/Add extra damage/));
    await userEvent.type(screen.getByLabelText("Extra damage dice"), "2d8");
    await userEvent.type(screen.getByLabelText("Name for the extra damage (optional)"), "Smite");
    // The prompt now counts both sets of dice.
    expect(screen.getByText(/4 numbers: 2d8, then 2d8 \(the last 2 for Smite\)/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Rolled real dice\? Type the number on each die/), "5, 3, 6, 2");
    await userEvent.click(screen.getByRole("button", { name: "Use my dice" }));

    expect(screen.getByText(/Smite 2d8 \[6, 2\] = 8/)).toBeInTheDocument();
    // And it says the extra went in, with the total.
    expect(screen.getByRole("status")).toHaveTextContent("✓ Smite added: +8. Total damage: 19.");
    await userEvent.click(screen.getByRole("button", { name: "Deal 19 damage" }));
    // The smite has no type (the player didn't give one), but stays its own part.
    expect(dealDamage).toHaveBeenCalledWith("t1", 19, [
      { amount: 11, type: "piercing", source: "Dagger" },
      { amount: 8, type: "", source: "Smite" },
    ]);
  });

  it("only applies the extra damage when it's switched on for this attack", async () => {
    // A stand-in for the browser's storage (CI's Node has none that works here).
    installFakeStorage();
    window.localStorage.setItem("qk-extra-damage", JSON.stringify({ text: "2d8", label: "Smite" }));
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d8 -> 5
    render(
      <AttackPanel
        attack={{ ...dagger, damage: "1d8+3" }}
        combat={makeCombat({ attack_state: "hit" })}
        onClose={vi.fn()}
      />,
    );

    // Remembered, but off: a plain roll is just the weapon.
    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
    expect(screen.getByRole("button", { name: "Deal 8 damage" })).toBeInTheDocument();

    // Switch it on and the remembered smite is added.
    await userEvent.click(screen.getByLabelText(/Add extra damage/));
    expect(screen.getByLabelText("Extra damage dice")).toHaveValue("2d8");
    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
    expect(screen.getByRole("button", { name: "Deal 18 damage" })).toBeInTheDocument();
    window.localStorage.clear();
  });

  it("shows the server's error, such as 'It is not your turn'", async () => {
    attackRoll.mockRejectedValue(new Error("It is not your turn"));
    render(<AttackPanel attack={dagger} combat={makeCombat()} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("It is not your turn");
  });

  it("rolls an enchanted weapon's extra dice as their own type, doubles them on a crit, and sends both", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // every d4 -> 3
    const enchanted = {
      ...dagger,
      name: "The Darling Deceiver",
      toHit: 10,
      damageParts: [
        { dice: "1d4+5", type: "piercing", source: "The Darling Deceiver" },
        { dice: "1d4", type: "fire", source: "Elemental Weapon" },
      ],
      modifiers: [
        { source: "Elemental Weapon", text: "+1 to hit" },
        { source: "Elemental Weapon", text: "+1d4 fire damage" },
      ],
      isEnchanted: true,
    };
    render(<AttackPanel attack={enchanted} combat={makeCombat({ attack_state: "hit", attack_crit: true })} onClose={vi.fn()} />);

    expect(screen.getByText(/✨ \+1 to hit \(Elemental Weapon\), \+1d4 fire damage \(Elemental Weapon\)/)).toBeInTheDocument();
    expect(screen.getByText(/1d4\+5 piercing \+ 1d4 fire, every die doubled/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
    // 3 x 2 + 5 = 11 piercing, 3 x 2 = 6 fire.
    await userEvent.click(screen.getByRole("button", { name: "Deal 17 damage" }));
    expect(dealDamage).toHaveBeenCalledWith("t1", 17, [
      { amount: 11, type: "piercing", source: "The Darling Deceiver" },
      { amount: 6, type: "fire", source: "Elemental Weapon" },
    ]);
  });

  it("uses the enchanted to-hit for the attack roll", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
    attackRoll.mockResolvedValue("hit");
    render(
      <AttackPanel
        attack={{ ...dagger, toHit: 10, damageParts: [{ dice: "1d4+5", type: "piercing" }], modifiers: [], isEnchanted: false }}
        combat={makeCombat()}
        onClose={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Roll d20 \(\+10\)/ }));
    expect(attackRoll).toHaveBeenCalledWith(expect.objectContaining({ bonus: 10 }));
  });

  // --- Dreadful Strikes (an on-hit feature) ---------------------------------------
  describe("Dreadful Strikes", () => {
    const dreadful = (status = "ok") => ({
      key: "dreadful strikes",
      name: "Dreadful Strikes",
      dice: "1d6",
      type: "psychic",
      limit: "oncePerTargetPerTurn",
      note: "Each creature can take it once per turn.",
      eligibility: { status },
    });
    const hitOn = (overrides = {}) => makeCombat({ attack_state: "hit", attack_target: "c-kobold", ...overrides });

    it("is offered after a hit, off until ticked, and dealt as its own psychic part", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // d4 -> 3, d6 -> 4
      const onOnHitDealt = vi.fn();
      render(<AttackPanel attack={dagger} combat={hitOn()} onClose={vi.fn()} onHitFeatures={[dreadful()]} onOnHitDealt={onOnHitDealt} />);

      const box = screen.getByRole("checkbox", { name: "Dreadful Strikes: +1d6 psychic" });
      expect(box).not.toBeChecked();
      await userEvent.click(box);
      await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
      await userEvent.click(screen.getByRole("button", { name: "Deal 10 damage" }));
      expect(dealDamage).toHaveBeenCalledWith("t1", 10, [
        { amount: 6, type: "piercing", source: "Dagger" },
        { amount: 4, type: "psychic", source: "Dreadful Strikes" },
      ]);
      expect(onOnHitDealt).toHaveBeenCalledWith([expect.objectContaining({ key: "dreadful strikes" })]);
    });

    it("can be declined: left unticked, it isn't rolled or used", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      const onOnHitDealt = vi.fn();
      render(<AttackPanel attack={dagger} combat={hitOn()} onClose={vi.fn()} onHitFeatures={[dreadful()]} onOnHitDealt={onOnHitDealt} />);

      await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
      await userEvent.click(screen.getByRole("button", { name: "Deal 6 damage" }));
      expect(dealDamage).toHaveBeenCalledWith("t1", 6, [{ amount: 6, type: "piercing", source: "Dagger" }]);
      expect(onOnHitDealt).not.toHaveBeenCalled();
    });

    it("doubles its dice on a critical hit, with the weapon's", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5);
      render(<AttackPanel attack={dagger} combat={hitOn({ attack_crit: true })} onClose={vi.fn()} onHitFeatures={[dreadful()]} />);

      await userEvent.click(screen.getByRole("checkbox", { name: "Dreadful Strikes: +1d6 psychic" }));
      await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
      // 3 x 2 + 3 piercing, 4 x 2 psychic.
      await userEvent.click(screen.getByRole("button", { name: "Deal 17 damage" }));
      expect(dealDamage).toHaveBeenCalledWith("t1", 17, [
        { amount: 9, type: "piercing", source: "Dagger" },
        { amount: 8, type: "psychic", source: "Dreadful Strikes" },
      ]);
    });

    it("isn't offered before the hit, so a miss can't use it", async () => {
      attackRoll.mockResolvedValue("miss");
      const onOnHitDealt = vi.fn();
      render(<AttackPanel attack={dagger} combat={makeCombat()} onClose={vi.fn()} onHitFeatures={[dreadful()]} onOnHitDealt={onOnHitDealt} />);

      expect(screen.queryByRole("checkbox", { name: /Dreadful Strikes/ })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));
      expect(await screen.findByText(/That misses!/)).toBeInTheDocument();
      expect(screen.queryByRole("checkbox", { name: /Dreadful Strikes/ })).not.toBeInTheDocument();
      expect(onOnHitDealt).not.toHaveBeenCalled();
    });

    it("is greyed out when it already landed on this creature this turn, and says so", () => {
      render(<AttackPanel attack={dagger} combat={hitOn()} onClose={vi.fn()} onHitFeatures={[dreadful("used")]} />);

      expect(screen.getByRole("checkbox", { name: "Dreadful Strikes: +1d6 psychic" })).toBeDisabled();
      expect(screen.getByText("Already used on Kobold this turn.")).toBeInTheDocument();
    });

    it("asks the player to keep track when the turn isn't known", () => {
      render(<AttackPanel attack={dagger} combat={hitOn()} onClose={vi.fn()} onHitFeatures={[dreadful("manual")]} />);

      expect(screen.getByRole("checkbox", { name: "Dreadful Strikes: +1d6 psychic" })).toBeEnabled();
      expect(screen.getByText(/can't tell whose turn it is, so check this yourself/)).toBeInTheDocument();
    });

    it("rides alongside Elemental Weapon, each part in its own type", async () => {
      vi.spyOn(Math, "random").mockReturnValue(0.5); // d4 -> 3, d6 -> 4
      const enchanted = {
        ...dagger,
        name: "The Darling Deceiver",
        damageParts: [
          { dice: "1d4+5", type: "piercing", source: "The Darling Deceiver" },
          { dice: "1d4", type: "fire", source: "Elemental Weapon" },
        ],
        modifiers: [],
        isEnchanted: false,
      };
      render(<AttackPanel attack={enchanted} combat={hitOn()} onClose={vi.fn()} onHitFeatures={[dreadful()]} />);

      await userEvent.click(screen.getByRole("checkbox", { name: "Dreadful Strikes: +1d6 psychic" }));
      await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
      await userEvent.click(screen.getByRole("button", { name: "Deal 15 damage" }));
      expect(dealDamage).toHaveBeenCalledWith("t1", 15, [
        { amount: 8, type: "piercing", source: "The Darling Deceiver" },
        { amount: 3, type: "fire", source: "Elemental Weapon" },
        { amount: 4, type: "psychic", source: "Dreadful Strikes" },
      ]);
    });
  });
});

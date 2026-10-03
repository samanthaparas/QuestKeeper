import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonsterAttackPanel from "./MonsterAttackPanel";
import { applyDamage, dmAttackRoll, dmLog, postPlayerDamage } from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/tableStore", () => ({
  dmAttackRoll: vi.fn(),
  dmLog: vi.fn(),
  postPlayerDamage: vi.fn(),
  applyDamage: vi.fn(),
}));

const kobold = { id: "c-kobold", name: "Kobold", kind: "monster" };
const targets = [
  { id: "c-goblin", name: "Goblin", kind: "monster", status: "healthy" },
  { id: "c-billie", name: "Billie", kind: "player", user_id: "u-billie", status: "healthy" },
  { id: "c-pip", name: "Sir Pip", kind: "ally", status: "healthy" },
  { id: "c-dead", name: "Dead Rat", kind: "monster", status: "down" },
];
const statBlock = {
  attacks: [
    { name: "Claw", toHit: 4, damage: "1d6+2" },
    { name: "Bite", toHit: 6, damage: "2d4" },
  ],
};

function setup(overrides = {}) {
  const props = {
    attacker: kobold,
    targets,
    statBlock,
    tableId: "t1",
    onChanged: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<MonsterAttackPanel {...props} />);
  return props;
}

afterEach(() => vi.restoreAllMocks());

describe("MonsterAttackPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postPlayerDamage.mockResolvedValue(undefined);
    applyDamage.mockResolvedValue(undefined);
    dmLog.mockResolvedValue(undefined);
  });

  it("offers every standing fighter, enemies of the attacker first, and not downed monsters", () => {
    setup();

    const options = screen.getAllByRole("option", { name: /Billie|Sir Pip|Goblin|Dead Rat/ });
    expect(options.map((option) => option.textContent)).toEqual([
      "Billie (player)",
      "Sir Pip (ally)",
      "Goblin",
    ]);
  });

  it("puts enemies first when an ally attacks", () => {
    setup({ attacker: { id: "c-pip", name: "Sir Pip", kind: "ally" }, targets });

    const options = screen.getAllByRole("option", { name: /Billie|Goblin/ });
    expect(options[0].textContent).toBe("Goblin");
  });

  it("fills the first attack from the stat block, and lets the DM switch attacks", async () => {
    setup();

    expect(screen.getByLabelText("Attack name")).toHaveValue("Claw");
    expect(screen.getByLabelText("Attack bonus")).toHaveValue(4);

    await userEvent.selectOptions(screen.getByLabelText("Which attack"), "1");
    expect(screen.getByLabelText("Attack name")).toHaveValue("Bite");
    expect(screen.getByLabelText("Attack bonus")).toHaveValue(6);
  });

  it("rolls a virtual d20 against the chosen target", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
    dmAttackRoll.mockResolvedValue({ result: "hit", ac: 12 });
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(dmAttackRoll).toHaveBeenCalledWith({
      attackerId: "c-kobold",
      targetId: "c-billie",
      attackName: "Claw",
      natural: 11,
      bonus: 4,
    });
    expect(await screen.findByText(/Rolled 11 \+ 4 = 15 against AC 12\. That hits!/)).toBeInTheDocument();
    expect(props.onChanged).toHaveBeenCalled();
  });

  it("accepts a physical d20 roll and rejects numbers outside 1-20", async () => {
    dmAttackRoll.mockResolvedValue({ result: "miss", ac: 18 });
    setup();

    await userEvent.type(screen.getByLabelText("Physical d20 roll"), "42");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/1 to 20/);
    expect(dmAttackRoll).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Physical d20 roll"));
    await userEvent.type(screen.getByLabelText("Physical d20 roll"), "6");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));
    expect(dmAttackRoll).toHaveBeenCalledWith(expect.objectContaining({ natural: 6, bonus: 4 }));
  });

  it("ends on a miss without asking for damage", async () => {
    dmAttackRoll.mockResolvedValue({ result: "miss", ac: 18 });
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByText(/That misses!/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Damage dice")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("sends damage to a PLAYER as a request they apply themselves", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d6 -> 4
    dmAttackRoll.mockResolvedValue({ result: "hit", ac: 12 });
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    // The stat block's damage is already filled in.
    expect(await screen.findByLabelText("Damage dice")).toHaveValue("1d6+2");
    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
    await userEvent.click(screen.getByRole("button", { name: "Send 6 damage" }));

    expect(postPlayerDamage).toHaveBeenCalledWith("t1", "u-billie", 6, "Kobold");
    expect(applyDamage).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });

  it("applies damage straight to a MONSTER or ALLY target", async () => {
    dmAttackRoll.mockResolvedValue({ result: "hit", ac: null });
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Who is being attacked"), "c-pip");
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    await userEvent.type(await screen.findByLabelText("Physical damage total"), "5");
    await userEvent.click(screen.getByRole("button", { name: "Send my damage" }));

    expect(applyDamage).toHaveBeenCalledWith("c-pip", 5);
    expect(postPlayerDamage).not.toHaveBeenCalled();
  });

  it("doubles the damage dice on a critical hit", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d6 -> 4
    dmAttackRoll.mockResolvedValue({ result: "crit", ac: 12 });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByText(/Critical hit!/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));

    expect(screen.getByRole("button", { name: "Send 10 damage" })).toBeInTheDocument();
  });

  it("lets the DM call the hit when the target has no AC saved", async () => {
    dmAttackRoll.mockResolvedValue({ result: "unknown", ac: null });
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Who is being attacked"), "c-goblin");
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByText(/Goblin has no AC saved/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Hit" }));

    expect(dmLog).toHaveBeenCalledWith("t1", "Kobold vs Goblin: That hits!");
    expect(await screen.findByLabelText("Damage dice")).toBeInTheDocument();
  });

  it("logs a called miss and finishes", async () => {
    dmAttackRoll.mockResolvedValue({ result: "unknown", ac: null });
    setup();
    await userEvent.selectOptions(screen.getByLabelText("Who is being attacked"), "c-goblin");
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    await userEvent.click(await screen.findByRole("button", { name: "Miss" }));

    expect(dmLog).toHaveBeenCalledWith("t1", "Kobold vs Goblin: That misses!");
    expect(await screen.findByRole("button", { name: "Done" })).toBeInTheDocument();
  });

  it("works for a monster with no stat block, using a custom attack", async () => {
    dmAttackRoll.mockResolvedValue({ result: "miss", ac: 14 });
    setup({ statBlock: {} });

    expect(screen.queryByLabelText("Which attack")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Attack name"), "Slam");
    await userEvent.type(screen.getByLabelText("Attack bonus"), "5");
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(dmAttackRoll).toHaveBeenCalledWith(expect.objectContaining({ attackName: "Slam", bonus: 5 }));
  });

  it("shows the server's error message", async () => {
    dmAttackRoll.mockRejectedValue(new Error("That fighter is down"));
    setup();

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That fighter is down");
  });
});

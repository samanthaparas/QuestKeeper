import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonsterAttackPanel from "./MonsterAttackPanel";
import { monsterAttackRoll, postPlayerDamage } from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/tableStore", () => ({
  monsterAttackRoll: vi.fn(),
  postPlayerDamage: vi.fn(),
}));

const kobold = { id: "c-kobold", name: "Kobold", kind: "monster" };
const players = [
  { id: "c-billie", user_id: "u-billie", name: "Billie", kind: "player" },
  { id: "c-thorn", user_id: "u-thorn", name: "Thorn", kind: "player" },
];

function setup(overrides = {}) {
  const props = {
    attacker: kobold,
    players,
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
  });

  it("rolls a virtual d20 against the chosen player", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11
    monsterAttackRoll.mockResolvedValue({ result: "hit", ac: 12 });
    const props = setup();

    await userEvent.selectOptions(screen.getByLabelText("Who is being attacked"), "u-thorn");
    await userEvent.type(screen.getByLabelText("Attack name"), "Claw");
    await userEvent.type(screen.getByLabelText("Attack bonus"), "4");
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(monsterAttackRoll).toHaveBeenCalledWith({
      attackerId: "c-kobold",
      targetUserId: "u-thorn",
      attackName: "Claw",
      natural: 11,
      bonus: 4,
    });
    expect(await screen.findByText(/Rolled 11 \+ 4 = 15 against AC 12\. That hits!/)).toBeInTheDocument();
    expect(props.onChanged).toHaveBeenCalled();
  });

  it("accepts a physical d20 roll and rejects numbers outside 1-20", async () => {
    monsterAttackRoll.mockResolvedValue({ result: "miss", ac: 18 });
    setup();

    await userEvent.type(screen.getByLabelText("Physical d20 roll"), "42");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/1 to 20/);
    expect(monsterAttackRoll).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Physical d20 roll"));
    await userEvent.type(screen.getByLabelText("Physical d20 roll"), "6");
    await userEvent.click(screen.getByRole("button", { name: "Use my roll" }));
    expect(monsterAttackRoll).toHaveBeenCalledWith(expect.objectContaining({ natural: 6, bonus: 0 }));
  });

  it("ends on a miss without asking for damage", async () => {
    monsterAttackRoll.mockResolvedValue({ result: "miss", ac: 18 });
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByText(/That misses!/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Damage dice")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("rolls damage after a hit and sends it to the player", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d6 -> 4
    monsterAttackRoll.mockResolvedValue({ result: "hit", ac: 12 });
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    await userEvent.type(await screen.findByLabelText("Damage dice"), "1d6+2");
    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));
    await userEvent.click(screen.getByRole("button", { name: "Send 6 damage" }));

    expect(postPlayerDamage).toHaveBeenCalledWith("t1", "u-billie", 6, "Kobold");
    expect(props.onClose).toHaveBeenCalled();
  });

  it("doubles the damage dice on a critical hit", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d6 -> 4
    monsterAttackRoll.mockResolvedValue({ result: "crit", ac: 12 });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByText(/Critical hit!/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Damage dice"), "1d6+2");
    await userEvent.click(screen.getByRole("button", { name: "Roll damage" }));

    expect(screen.getByRole("button", { name: "Send 10 damage" })).toBeInTheDocument();
  });

  it("sends a physical damage total, and refuses zero", async () => {
    monsterAttackRoll.mockResolvedValue({ result: "hit", ac: 12 });
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    await userEvent.type(await screen.findByLabelText("Physical damage total"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Send my damage" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 1/);
    expect(postPlayerDamage).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText("Physical damage total"));
    await userEvent.type(screen.getByLabelText("Physical damage total"), "7");
    await userEvent.click(screen.getByRole("button", { name: "Send my damage" }));
    expect(postPlayerDamage).toHaveBeenCalledWith("t1", "u-billie", 7, "Kobold");
  });

  it("shows the server's error message", async () => {
    monsterAttackRoll.mockRejectedValue(new Error("That enemy is down"));
    setup();

    await userEvent.click(screen.getByRole("button", { name: /Roll d20/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That enemy is down");
  });
});

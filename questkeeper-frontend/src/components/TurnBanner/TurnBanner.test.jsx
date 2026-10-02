import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TurnBanner from "./TurnBanner";
import { resolveDamageRequest } from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/tableStore", () => ({
  resolveDamageRequest: vi.fn(),
}));

function makeCombat(overrides = {}) {
  return {
    round: 2,
    now: { id: "c-kobold", name: "Kobold" },
    next: { id: "c-me", name: "Billie" },
    myCombatant: { id: "c-me" },
    isMyTurn: false,
    latestEvent: { message: "Billie attacks Kobold with Dagger (rolled 15). That hits!" },
    damageRequests: [],
    refresh: vi.fn(),
    ...overrides,
  };
}

describe("TurnBanner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when there is no fight", () => {
    const { container } = render(<TurnBanner combat={null} onApplyDamage={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the round, who is up, who is next, and the latest event", () => {
    render(<TurnBanner combat={makeCombat()} onApplyDamage={vi.fn()} />);

    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.getByText("Now: Kobold")).toBeInTheDocument();
    expect(screen.getByText("You're up next")).toBeInTheDocument();
    expect(screen.getByText(/That hits!/)).toBeInTheDocument();
  });

  it("shows how many attacks the current player has made this turn", () => {
    const combat = makeCombat({
      now: { id: "c-thorn", name: "Thorn", kind: "player", attacks_this_turn: 2 },
    });
    render(<TurnBanner combat={combat} onApplyDamage={vi.fn()} />);

    expect(screen.getByText(/Thorn has attacked 2 times this turn/)).toBeInTheDocument();
  });

  it("says 'You have' and uses the singular for your own first attack", () => {
    const combat = makeCombat({
      isMyTurn: true,
      now: { id: "c-me", name: "Billie", kind: "player", attacks_this_turn: 1 },
    });
    render(<TurnBanner combat={combat} onApplyDamage={vi.fn()} />);

    expect(screen.getByText(/You have attacked 1 time this turn/)).toBeInTheDocument();
  });

  it("shows no counter before anyone has attacked", () => {
    const combat = makeCombat({
      now: { id: "c-thorn", name: "Thorn", kind: "player", attacks_this_turn: 0 },
    });
    render(<TurnBanner combat={combat} onApplyDamage={vi.fn()} />);

    expect(screen.queryByText(/attacked/)).not.toBeInTheDocument();
  });

  it("celebrates your own turn", () => {
    render(<TurnBanner combat={makeCombat({ isMyTurn: true })} onApplyDamage={vi.fn()} />);

    expect(screen.getByText("It's your turn!")).toBeInTheDocument();
  });

  it("applies damage the DM posted, once", async () => {
    resolveDamageRequest.mockResolvedValue(5);
    const onApplyDamage = vi.fn();
    const combat = makeCombat({
      damageRequests: [{ id: "r1", source: "Kobold", amount: 5 }],
    });
    render(<TurnBanner combat={combat} onApplyDamage={onApplyDamage} />);

    expect(screen.getByText(/Kobold hits you for/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Apply 5 damage" }));

    expect(resolveDamageRequest).toHaveBeenCalledWith("r1", true);
    expect(onApplyDamage).toHaveBeenCalledWith(5);
    expect(combat.refresh).toHaveBeenCalled();
  });

  it("dismisses damage without changing HP", async () => {
    resolveDamageRequest.mockResolvedValue(5);
    const onApplyDamage = vi.fn();
    render(
      <TurnBanner
        combat={makeCombat({ damageRequests: [{ id: "r1", source: "Kobold", amount: 5 }] })}
        onApplyDamage={onApplyDamage}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(resolveDamageRequest).toHaveBeenCalledWith("r1", false);
    expect(onApplyDamage).not.toHaveBeenCalled();
  });

  it("does not lower HP if the server says it was already handled", async () => {
    resolveDamageRequest.mockRejectedValue(new Error("That damage was already handled"));
    const onApplyDamage = vi.fn();
    render(
      <TurnBanner
        combat={makeCombat({ damageRequests: [{ id: "r1", source: "Kobold", amount: 5 }] })}
        onApplyDamage={onApplyDamage}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Apply 5 damage" }));

    expect(onApplyDamage).not.toHaveBeenCalled();
    expect(await screen.findByText(/already handled/)).toBeInTheDocument();
  });
});

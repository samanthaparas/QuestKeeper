import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonsterConcentration from "./MonsterConcentration";
import { keepMonsterConcentration, setMonsterConcentration } from "../../utils/tableStore";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));
vi.mock("../../utils/tableStore", () => ({
  keepMonsterConcentration: vi.fn().mockResolvedValue(undefined),
  setMonsterConcentration: vi.fn().mockResolvedValue(undefined),
}));

const shroom = { id: "c-shroom", name: "Shroom", status: "bloodied", damage_taken: 24 };
// Took 24 since the spell started: DC 12. CON save +2.
const secret = { concentration: "Hold Person", concentration_damage: 0, stat_block: { saves: { constitution: 2 } } };

describe("MonsterConcentration", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("rolls the save and keeps the spell on a pass", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // d20 -> 11, + 2 = 13
    const onChanged = vi.fn();
    render(<MonsterConcentration combatant={shroom} secret={secret} onChanged={onChanged} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Constitution save, DC 12 (+2)");
    await userEvent.click(screen.getByRole("button", { name: "Roll CON save" }));
    expect(screen.getByRole("status")).toHaveTextContent("11 + 2 = 13 against DC 12. Hold Person holds.");
    expect(keepMonsterConcentration).toHaveBeenCalledWith("c-shroom", 24);
    expect(onChanged).toHaveBeenCalled();
  });

  it("ends the spell on a failed save", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // d20 -> 1
    render(<MonsterConcentration combatant={shroom} secret={secret} onChanged={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Roll CON save" }));
    expect(screen.getByRole("status")).toHaveTextContent("Hold Person ends.");
    expect(setMonsterConcentration).toHaveBeenCalledWith("c-shroom", null, 24);
  });

  it("shows the spell with an End button when no save is due, and nothing once it's down", () => {
    const settled = { ...secret, concentration_damage: 24 };
    const { rerender } = render(<MonsterConcentration combatant={shroom} secret={settled} onChanged={vi.fn()} />);
    expect(screen.getByText(/Concentrating on/)).toHaveTextContent("Concentrating on Hold Person");
    expect(screen.getByRole("button", { name: "End" })).toBeInTheDocument();

    rerender(<MonsterConcentration combatant={{ ...shroom, status: "down" }} secret={settled} onChanged={vi.fn()} />);
    expect(screen.queryByText(/Hold Person/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

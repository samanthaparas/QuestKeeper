import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EquipmentChoiceStep from "./EquipmentChoiceStep";
import { getEquipmentCategory } from "../../utils/api";
import { parseEquipmentChoices } from "../../utils/equipmentChoices";

vi.mock("../../utils/api", () => ({ getEquipmentCategory: vi.fn() }));

const fighterRaw = {
  starting_equipment_options: [
    {
      choose: 1,
      from: {
        option_set_type: "options_array",
        options: [
          {
            option_type: "counted_reference",
            count: 1,
            of: { index: "chain-mail", name: "Chain Mail" },
          },
          {
            option_type: "counted_reference",
            count: 1,
            of: { index: "leather-armor", name: "Leather Armor" },
          },
        ],
      },
    },
    {
      choose: 1,
      from: {
        option_set_type: "options_array",
        options: [
          {
            option_type: "counted_reference",
            count: 2,
            of: { index: "handaxe", name: "Handaxe" },
          },
          {
            option_type: "choice",
            choice: {
              desc: "two martial weapons",
              choose: 2,
              from: {
                option_set_type: "equipment_category",
                equipment_category: {
                  index: "martial-weapons",
                  name: "Martial Weapons",
                },
              },
            },
          },
        ],
      },
    },
  ],
};
const groups = parseEquipmentChoices(fighterRaw, "class");

function setup() {
  const onNext = vi.fn();
  render(
    <EquipmentChoiceStep
      groups={groups}
      sourceNames={{ class: "Fighter" }}
      fixedGear={[
        { index: "explorers-pack", name: "Explorer's Pack", quantity: 1 },
      ]}
      onNext={onNext}
      onBack={vi.fn()}
    />,
  );
  return { onNext, user: userEvent.setup() };
}

describe("EquipmentChoiceStep", () => {
  beforeEach(() => {
    getEquipmentCategory.mockReset();
    getEquipmentCategory.mockResolvedValue({
      index: "martial-weapons",
      equipment: [
        { index: "longsword", name: "Longsword" },
        { index: "battleaxe", name: "Battleaxe" },
      ],
    });
  });

  it("shows the gear you always get and starts on the classic picks", async () => {
    const { onNext, user } = setup();

    expect(
      screen.getByText(/You also start with:/).closest("p"),
    ).toHaveTextContent("Explorer's Pack");
    expect(screen.getByLabelText(/\(a\) Chain Mail/)).toBeChecked();
    expect(screen.getByLabelText(/\(a\) Handaxe ×2/)).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledWith(expect.any(Object), [
      { index: "chain-mail", name: "Chain Mail", quantity: 1 },
      { index: "handaxe", name: "Handaxe", quantity: 2 },
    ]);
  });

  it("asks for each weapon when an option says 'two martial weapons'", async () => {
    const { onNext, user } = setup();

    await user.click(screen.getByLabelText(/\(b\) two martial weapons/));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    const first = await screen.findByLabelText("two martial weapons (1 of 2)");
    await screen.findByRole("option", {
      name: "Choose #1 from Martial Weapons",
    });
    await user.selectOptions(first, "longsword");
    await user.selectOptions(
      screen.getByLabelText("two martial weapons (2 of 2)"),
      "battleaxe",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onNext.mock.calls[0][1]).toEqual([
      { index: "chain-mail", name: "Chain Mail", quantity: 1 },
      { index: "longsword", name: "Longsword", quantity: 1 },
      { index: "battleaxe", name: "Battleaxe", quantity: 1 },
    ]);
  });

  it("lets the player go on if an item list can't load", async () => {
    getEquipmentCategory.mockRejectedValue(new Error("offline"));
    const { user } = setup();

    await user.click(screen.getByLabelText(/\(b\) two martial weapons/));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "add those items later",
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });
});

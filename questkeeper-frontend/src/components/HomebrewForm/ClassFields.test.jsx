import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomebrewForm from "./HomebrewForm";
import { emptyHomebrewForm } from "../../utils/homebrewForm";

function renderClassForm(onSave = vi.fn().mockResolvedValue()) {
  render(
    <MemoryRouter>
      <HomebrewForm initialForm={emptyHomebrewForm("class")} onSave={onSave} onCancel={vi.fn()} />
    </MemoryRouter>,
  );
  return onSave;
}

describe("homebrew class form", () => {
  it("allows two saving throws and asks for them before saving", async () => {
    const onSave = renderClassForm();
    await userEvent.type(screen.getByLabelText("Name"), "Tinkerer");
    await userEvent.click(screen.getByRole("button", { name: "Save class" }));
    expect(screen.getByRole("alert")).toHaveTextContent("two saving throws");

    await userEvent.click(screen.getByRole("checkbox", { name: "Constitution" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Intelligence" }));
    expect(screen.getByRole("checkbox", { name: "Wisdom" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Save class" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ category: "class", name: "Tinkerer" }),
    );
    expect(onSave.mock.calls[0][0].data.savingThrows).toEqual(["con", "int"]);
  });

  it("shows the spellcasting options only for a caster, and previews the class", async () => {
    renderClassForm();
    expect(screen.queryByLabelText("Casts with")).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText("Spell slots"), "half-early");
    expect(screen.getByLabelText("Casts with")).toHaveValue("intelligence");
    expect(screen.getByLabelText("Uses the spell list of")).toHaveValue("wizard");

    await userEvent.selectOptions(screen.getByLabelText("Hit die"), "10");
    const preview = screen.getByRole("complementary", { name: "Preview" });
    expect(within(preview).getByText("d10")).toBeInTheDocument();
  });
});

describe("homebrew subclass form", () => {
  it("saves a feature's damage by level and a bonus spell's feature and free cast", async () => {
    const onSave = vi.fn().mockResolvedValue();
    render(
      <MemoryRouter>
        <HomebrewForm initialForm={emptyHomebrewForm("subclass")} onSave={onSave} onCancel={vi.fn()} />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText("Name"), "Fey Wanderer");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /class/i }), "ranger");

    await userEvent.click(screen.getByRole("button", { name: "Add a feature" }));
    await userEvent.type(screen.getByLabelText("Features 1 name"), "Dreadful Strikes");
    await userEvent.click(screen.getByRole("button", { name: "Add extra damage to Dreadful Strikes" }));
    await userEvent.type(screen.getByLabelText("Dreadful Strikes damage 1 dice"), "1d4");
    await userEvent.type(screen.getByLabelText("Dreadful Strikes damage 1 type"), "psychic");
    await userEvent.type(screen.getByLabelText("Dreadful Strikes damage: when it applies"), "Once per creature per turn");

    await userEvent.click(screen.getByRole("button", { name: "Add a bonus spell" }));
    await userEvent.type(screen.getByLabelText("Bonus spell 1 name"), "Summon Fey");
    await userEvent.type(screen.getByLabelText("Bonus spell 1 comes from (optional)"), "Fey Reinforcements");
    await userEvent.click(screen.getByRole("checkbox", { name: "1 free cast per long rest" }));

    await userEvent.click(screen.getByRole("button", { name: /^Save/ }));
    const { data } = onSave.mock.calls[0][0];
    expect(data.features[0]).toMatchObject({
      name: "Dreadful Strikes",
      damage: [{ level: 3, dice: "1d4", type: "psychic" }],
      damageNote: "Once per creature per turn",
    });
    expect(data.spells[0]).toMatchObject({ name: "Summon Fey", source: "Fey Reinforcements", freeCast: true });
  });
});

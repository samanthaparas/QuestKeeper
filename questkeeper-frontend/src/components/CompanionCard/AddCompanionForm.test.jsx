import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddCompanionForm from "./AddCompanionForm";
import { addCompanion, companionFromDraft, getCompanions } from "../../utils/characterSheet";

function renderForm() {
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(<AddCompanionForm onAdd={onAdd} onCancel={onCancel} />);
  return { onAdd, onCancel };
}

describe("AddCompanionForm", () => {
  it("asks who is being added first, and says other summons use typed stats", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "Who are you adding?" })).toHaveFocus();
    expect(screen.getByRole("button", { name: /Pet, mount, familiar or other companion/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Summoned creature/ })).toBeInTheDocument();
    expect(screen.getByText(/Other summon spells, and features that give you a familiar or companion, aren't worked out/)).toBeInTheDocument();
  });

  it("Cancel adds nothing", async () => {
    const { onAdd, onCancel } = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Pet, mount/ }));
    await userEvent.type(screen.getByLabelText("Name"), "Victory");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("needs a name before adding", async () => {
    const { onAdd } = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Pet, mount/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add companion" }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Give it a name first.");
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("adds a pet with its main stats, a first attack and notes, all at once", async () => {
    const { onAdd } = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Pet, mount/ }));
    await userEvent.type(screen.getByLabelText("Name"), "Victory");
    await userEvent.type(screen.getByLabelText("Max HP"), "11");
    await userEvent.type(screen.getByLabelText("AC"), "13");
    await userEvent.type(screen.getByLabelText("Speed (ft)"), "40");
    await userEvent.type(screen.getByLabelText("STR"), "12");
    await userEvent.type(screen.getByLabelText("Attack"), "Bite");
    await userEvent.type(screen.getByLabelText("To hit"), "4");
    await userEvent.type(screen.getByLabelText("Damage"), "2d4+2");
    await userEvent.type(screen.getByLabelText("Type"), "piercing");
    await userEvent.type(screen.getByLabelText(/Notes/), "Knows Help{enter}- Wears barding");
    await userEvent.click(screen.getByRole("button", { name: "Add companion" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const [creature, link] = onAdd.mock.calls[0];
    expect(link).toBeNull();
    expect(creature).toMatchObject({
      name: "Victory",
      hitPoints: { current: 11, max: 11 },
      armorClass: 13,
      speed: 40,
      abilityScores: { strength: 12, dexterity: 10 },
      attacks: [expect.objectContaining({ name: "Bite", toHit: 4, damage: "2d4+2", damageType: "piercing" })],
    });
    expect(creature.noteList.map((note) => note.text)).toEqual(["Knows Help", "Wears barding"]);
  });

  it("adds a summoned creature linked to Summon Fey, keeping its own attack name", async () => {
    const { onAdd } = renderForm();
    await userEvent.click(screen.getByRole("button", { name: /Summoned creature/ }));
    expect(screen.getByText("Summon Fey")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "Fable");
    await userEvent.type(screen.getByLabelText(/Attack name/), "Bite");
    await userEvent.click(screen.getByRole("button", { name: "Add companion" }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Fable" }), {
      template: "summonFey",
      attackName: "Bite",
    });
  });
});

describe("adding a companion from a draft", () => {
  it("adds exactly one, with the usual starting values for blank boxes", () => {
    const sheet = { companions: [{ id: "old", name: "Victory" }] };
    const next = addCompanion(sheet, companionFromDraft({
      name: "Owl",
      maxHp: "",
      armorClass: "",
      speed: "",
      scores: {},
      attackName: "",
      attackToHit: "",
      attackDamage: "",
      attackType: "",
      notes: "",
    }));
    const companions = getCompanions(next);
    expect(companions).toHaveLength(2);
    expect(companions[0]).toEqual({ id: "old", name: "Victory" });
    expect(companions[1]).toMatchObject({ name: "Owl", armorClass: 10, speed: 30, hitPoints: { current: 0, max: 0 }, attacks: [] });
    expect(companions[1].id).toBeTruthy();
  });
});

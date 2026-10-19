import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CastEffectPanel, { EffectStrip } from "./CastEffectPanel";
import { EFFECT_TEMPLATES, previewEffect } from "../../utils/combatEffects";

const sheet = {
  attacks: [
    { index: "a1", name: "The Darling Deceiver", toHit: 9, damage: "1d4+5", damageType: "Piercing" },
    { index: "a2", name: "Wisteria's Kiss", toHit: 11, damage: "1d8+5", damageType: "Piercing" },
  ],
};

function renderPanel(overrides = {}) {
  const onCast = vi.fn().mockReturnValue("");
  const onClose = vi.fn();
  const options = {
    template: EFFECT_TEMPLATES.elementalWeapon,
    weapons: sheet.attacks.map(({ index, name }) => ({ index, name })),
    slotLevels: [
      { level: 3, current: 2, max: 3 },
      { level: 5, current: 1, max: 1 },
    ],
    otherConcentration: "",
    preview: (choices) => previewEffect(sheet, "elementalWeapon", choices),
    ...overrides,
  };
  render(<CastEffectPanel options={options} onCast={onCast} onClose={onClose} />);
  return { onCast, onClose };
}

describe("CastEffectPanel", () => {
  it("asks for the weapon, damage type and slot, and previews the weapon", async () => {
    const { onCast, onClose } = renderPanel();
    expect(screen.getByText(/Concentration, up to 1 hour/)).toBeInTheDocument();
    expect(screen.getByText("The Darling Deceiver: +9 →", { exact: false })).toHaveTextContent(
      "The Darling Deceiver: +9 → +10 to hit · 1d4+5 piercing + 1d4 acid",
    );

    await userEvent.selectOptions(screen.getByLabelText("Damage type"), "Fire");
    await userEvent.selectOptions(screen.getByLabelText("Spell slot"), "5");
    expect(screen.getByText(/\+11 to hit/).closest("p")).toHaveTextContent(
      "The Darling Deceiver: +9 → +11 to hit · 1d4+5 piercing + 2d4 fire",
    );

    await userEvent.click(screen.getByRole("button", { name: "Cast Elemental Weapon (level 5 slot)" }));
    expect(onCast).toHaveBeenCalledWith({ attackIndex: "a1", damageType: "Fire", slotLevel: 5 });
    expect(onClose).toHaveBeenCalled();
  });

  it("warns that it ends other concentration", () => {
    renderPanel({ otherConcentration: "Hunter's Mark" });
    expect(screen.getByText("Casting this ends your concentration on Hunter's Mark.")).toBeInTheDocument();
  });

  it("can't be cast with no slots left at that level, and starts on a level that has some", () => {
    renderPanel({
      slotLevels: [
        { level: 3, current: 0, max: 3 },
        { level: 5, current: 1, max: 1 },
      ],
    });
    expect(screen.getByLabelText("Spell slot")).toHaveValue("5");
  });

  it("is disabled with no slots at all, and says when there's no weapon", () => {
    renderPanel({ slotLevels: [{ level: 3, current: 0, max: 3 }], weapons: [] });
    expect(screen.getByRole("button", { name: /Cast Elemental Weapon/ })).toBeDisabled();
    expect(screen.getByText(/No nonmagical weapons/)).toBeInTheDocument();
    expect(screen.getByText("No level 3 slots left.")).toBeInTheDocument();
  });

  it("shows the problem and stays open if the cast is refused", async () => {
    const onCast = vi.fn().mockReturnValue("No level 3 spell slots left.");
    const onClose = vi.fn();
    render(
      <CastEffectPanel
        options={{
          template: EFFECT_TEMPLATES.elementalWeapon,
          weapons: [{ index: "a1", name: "The Darling Deceiver" }],
          slotLevels: [{ level: 3, current: 1, max: 3 }],
          otherConcentration: "",
          preview: (choices) => previewEffect(sheet, "elementalWeapon", choices),
        }}
        onCast={onCast}
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Cast Elemental Weapon/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("No level 3 spell slots left.");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("EffectStrip", () => {
  it("says what's on the weapon, how long it lasts, and ends it", async () => {
    const onEnd = vi.fn();
    render(
      <EffectStrip
        effects={[
          {
            id: "e1",
            key: "elementalWeapon",
            spell: "Elemental Weapon",
            slotLevel: 3,
            damageType: "Fire",
            attackName: "The Darling Deceiver",
            concentration: true,
          },
        ]}
        describe={() => "+1 to hit, +1d4 fire damage"}
        onEnd={onEnd}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "✨ Elemental Weapon (fire) on The Darling Deceiver, level 3 slot: +1 to hit, +1d4 fire damage · Concentration, up to 1 hour. Ends if you rest, lose concentration or tap End.",
    );
    await userEvent.click(screen.getByRole("button", { name: "End Elemental Weapon" }));
    expect(onEnd).toHaveBeenCalledWith("e1");
  });
});

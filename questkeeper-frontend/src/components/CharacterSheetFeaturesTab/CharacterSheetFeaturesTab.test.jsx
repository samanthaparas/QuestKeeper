import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CharacterSheetFeaturesTab from "./CharacterSheetFeaturesTab";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

vi.mock("../../utils/api", () => ({
  getFeats: vi.fn().mockResolvedValue([]),
  getFeatDetails: vi.fn(),
  getClassFeatures: vi.fn().mockResolvedValue([
    { index: "divine-sense", name: "Divine Sense" },
    { index: "aura-of-protection", name: "Aura of Protection" },
  ]),
  getSubclassFeatures: vi.fn(),
  getRaceTraits: vi.fn().mockResolvedValue([]),
  getSubraceTraits: vi.fn(),
  getTraitDetails: vi.fn(),
  getFeatureDetails: vi.fn((index) =>
    Promise.resolve(
      index === "divine-sense"
        ? {
            name: "Divine Sense",
            level: 1,
            class: { name: "Paladin" },
            desc: ["Detect fiends."],
          }
        : {
            name: "Aura of Protection",
            level: 6,
            class: { name: "Paladin" },
            desc: ["Add Charisma to saves."],
          },
    ),
  ),
}));

function renderTab(props = {}) {
  const handlers = { onFeaturesAddMany: vi.fn() };
  render(
    <CharacterSheetFeaturesTab
      classId="paladin"
      level={3}
      features={[]}
      feats={[]}
      proficiencies={[]}
      languages=""
      size="Medium"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("CharacterSheetFeaturesTab: add from class and race", () => {
  it("ticks the features the character has reached and adds them in one go", async () => {
    const { onFeaturesAddMany } = renderTab();

    await userEvent.click(
      screen.getByRole("button", { name: "Add from my class and race" }),
    );

    const sense = await screen.findByRole("checkbox", { name: /Divine Sense/ });
    const aura = screen.getByRole("checkbox", { name: /Aura of Protection/ });
    expect(sense).toBeChecked();
    expect(aura).not.toBeChecked();

    await userEvent.click(aura);
    await userEvent.click(
      screen.getByRole("button", { name: "Add 2 features" }),
    );

    expect(onFeaturesAddMany).toHaveBeenCalledWith([
      { name: "Divine Sense", description: "Detect fiends." },
      { name: "Aura of Protection", description: "Add Charisma to saves." },
    ]);
  });

  it("shows features already on the sheet as added and leaves them unticked", async () => {
    renderTab({
      features: [{ index: "f1", name: "Divine Sense", description: "" }],
    });

    await userEvent.click(
      screen.getByRole("button", { name: "Add from my class and race" }),
    );

    const sense = await screen.findByRole("checkbox", { name: /Divine Sense/ });
    expect(sense).toBeDisabled();
    expect(sense).not.toBeChecked();
    expect(screen.getByText(/already on your sheet/)).toBeInTheDocument();
  });
});

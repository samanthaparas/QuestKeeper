import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompanionCard from "./CompanionCard";
import { applySummonAction, getSummonInfo } from "../../utils/characterSheet";

vi.mock("../../utils/supabaseClient", () => ({ supabase: {} }));

const wolf = {
  name: "Victory",
  armorClass: 13,
  speed: 40,
  hitPoints: { current: 11, max: 11 },
  attacks: [{ id: "a1", name: "Bite", toHit: 4, damage: "2d4+2", damageType: "Piercing" }],
};

function renderCard(props = {}) {
  const handlers = {
    onHpChange: vi.fn(),
    onAttackAdd: vi.fn(),
    onAttackUpdate: vi.fn(),
    onAttackRemove: vi.fn(),
    onFieldChange: vi.fn(),
    onAbilityChange: vi.fn(),
    onSaveChange: vi.fn(),
    onNotesChange: vi.fn(),
  };
  render(<CompanionCard companion={wolf} {...handlers} {...props} />);
  return handlers;
}

const blank = { id: "c-new", name: "", armorClass: 10, speed: 30, hitPoints: { current: 0, max: 0 }, attacks: [] };

describe("CompanionCard: setting up a new companion", () => {
  it("opens a just-added companion unlocked, with the name box ready and a short guide", () => {
    renderCard({ companion: blank, isNew: true });

    expect(screen.getByLabelText("Companion's name")).toHaveFocus();
    expect(screen.getByText(/Set up your companion:/)).toBeInTheDocument();
    expect(screen.getByLabelText("Companion's max HP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "✓ Done editing" })).toBeInTheDocument();
  });

  it("explains that Summon Fey rules are only for that spell", () => {
    renderCard({ companion: blank, isNew: true });
    expect(screen.getByText(/Only for a companion you bring in with the/)).toHaveTextContent(
      "A pet, mount, familiar or beast companion doesn't need this",
    );
  });

  it("offers a clear Set up button on a companion left blank, and Done editing locks it", async () => {
    renderCard({ companion: blank });
    expect(screen.getByText("This companion isn't set up yet.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Set up Companion" }));
    expect(screen.getByLabelText("Companion's name")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "✓ Done editing" }));
    expect(screen.queryByLabelText("Companion's name")).not.toBeInTheDocument();
  });

  it("doesn't nag about set-up once it has a name or HP", () => {
    renderCard();
    expect(screen.queryByText(/isn't set up yet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Set up your companion/)).not.toBeInTheDocument();
  });
});

describe("CompanionCard", () => {
  it("shows the companion's HP, AC, speed and attacks", () => {
    renderCard();
    const heading = screen.getByRole("heading", { name: "Victory" });
    // The paw stands in for a picture until there is one.
    expect(heading.querySelector(".companion-card__name-icon")).not.toBeNull();
    expect(screen.getByLabelText("Victory's current HP")).toHaveValue(11);
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("40 ft")).toBeInTheDocument();
    expect(screen.getByText("Bite")).toBeInTheDocument();
    expect(screen.getByText("+4")).toBeInTheDocument();
  });

  it("tracks HP", async () => {
    const { onHpChange } = renderCard();
    // The page owns the value, so each keystroke reports the box's new text.
    await userEvent.type(screen.getByLabelText("Victory's current HP"), "{backspace}");
    expect(onHpChange).toHaveBeenLastCalledWith("current", "1");
  });

  it("adds an attack", async () => {
    const { onAttackAdd } = renderCard({ companion: { ...wolf, attacks: [] } });
    expect(screen.getByText(/Add Victory's attacks/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Add Attack" }));
    await userEvent.type(screen.getByPlaceholderText("Attack (e.g. Bite)"), "Bite");
    // Every box has a name of its own, not just a placeholder that vanishes.
    await userEvent.type(screen.getByRole("spinbutton", { name: "To hit" }), "4");
    await userEvent.type(screen.getByRole("textbox", { name: "Damage (e.g. 2d4+2)" }), "2d4+2");
    expect(screen.getByRole("textbox", { name: "Type (e.g. Piercing)" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Add Attack" }).at(-1));

    expect(onAttackAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Bite", toHit: "4", damage: "2d4+2" }));
  });

  it("offers a picture upload beside the name, and drops the paw once there's a picture", () => {
    const upload = { userId: "u1", characterId: "c1", onPortraitUpload: vi.fn() };
    renderCard(upload);
    expect(screen.getByRole("button", { name: "Upload a picture of Victory" })).toBeInTheDocument();

    renderCard({ ...upload, companion: { ...wolf, portraitUrl: "https://example.com/v.png" } });
    expect(screen.getByRole("button", { name: "Change Victory's picture" })).toBeInTheDocument();
    const withPicture = screen.getAllByRole("heading", { name: "Victory" }).at(-1);
    expect(withPicture.querySelector(".companion-card__name-icon")).toBeNull();
  });

  it("shows the six ability scores with their modifiers, using 10 for any not set yet", async () => {
    renderCard({ companion: { ...wolf, abilityScores: { strength: 18, dexterity: 7 } } });
    // Folded in play; one tap opens it.
    const fold = screen.getByRole("button", { name: "Stats & saves" });
    expect(fold).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list", { name: "Victory's ability scores" })).toBeNull();
    await userEvent.click(fold);
    expect(fold).toHaveAttribute("aria-expanded", "true");
    const strip = screen.getByRole("list", { name: "Victory's ability scores" });
    const items = within(strip).getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual([
      "STR18+4Save +4",
      "DEX7-2Save -2",
      "CON10+0Save +0",
      "INT10+0Save +0",
      "WIS10+0Save +0",
      "CHA10+0Save +0",
    ]);
  });

  it("locks the stats until Edit stats is tapped, then lets them be typed", async () => {
    const user = userEvent.setup();
    const { onAbilityChange, onFieldChange } = renderCard();
    expect(screen.queryByLabelText("Victory's STR score")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "🔒 Edit stats" }));
    await user.type(screen.getByLabelText("Victory's STR score"), "8");
    expect(onAbilityChange).toHaveBeenLastCalledWith("strength", "108");
    await user.type(screen.getByLabelText("Victory's AC"), "4");
    expect(onFieldChange).toHaveBeenLastCalledWith("armorClass", "134");

    // A companion stays on its sheet: there's no way to remove it.
    expect(screen.queryByRole("button", { name: /Remove Victory/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "🔓 Done editing" }));
    expect(screen.queryByLabelText("Victory's STR score")).not.toBeInTheDocument();
  });

  it("adds and removes bulleted notes", async () => {
    const user = userEvent.setup();
    const notes = [{ id: "n1", text: "Wears barding" }];
    const { onNotesChange } = renderCard({ notes });
    expect(screen.getByText("Wears barding")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New note about Victory"), "Flies 90 ft{Enter}");
    expect(onNotesChange).toHaveBeenLastCalledWith([
      notes[0],
      expect.objectContaining({ text: "Flies 90 ft" }),
    ]);

    // Removing waits for "Edit stats", like the other lists' Edit buttons.
    expect(screen.queryByRole("button", { name: "Remove note: Wears barding" })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Edit stats/ }));
    await user.click(screen.getByRole("button", { name: "Remove note: Wears barding" }));
    expect(onNotesChange).toHaveBeenLastCalledWith([]);
  });

  it("shows a typed save bonus, and lets it be typed or cleared while editing", async () => {
    const user = userEvent.setup();
    const { onSaveChange } = renderCard({ companion: { ...wolf, savingThrows: { dexterity: 5 } } });
    expect(screen.getByText("Save +5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "🔒 Edit stats" }));
    const dexSave = screen.getByLabelText("Victory's DEX save bonus");
    expect(dexSave).toHaveValue(5);
    await user.clear(dexSave);
    expect(onSaveChange).toHaveBeenLastCalledWith("dexterity", "");
    await user.type(screen.getByLabelText("Victory's WIS save bonus"), "3");
    expect(onSaveChange).toHaveBeenLastCalledWith("wisdom", "3");
  });

  describe("following Summon Fey", () => {
    const fable = {
      name: "Fable",
      armorClass: 15,
      speed: 40,
      hitPoints: { current: 30, max: 30 },
      attacks: [{ id: "b1", name: "Bite", toHit: 6, damage: "2d6+6", damageType: "Piercing" }],
    };
    const sheetWith = (extra = {}) => ({
      features: [{ name: "Fey Reinforcements" }],
      spellcasting: { spellSlots: [{ level: 3, max: 3, current: 2 }, { level: 4, max: 1, current: 1 }] },
      resources: [{ id: "fc", name: "Summon Fey (free cast)", max: 1, current: 1, freeCastFor: "Summon Fey" }],
      companionMode: "creature",
      companionCreature: fable,
      ...extra,
    });
    const linked = () => applySummonAction(sheetWith(), "link", { template: "summonFey" });

    // Opens the setup inside the card, as a player would.
    async function openSetup(summon, extra = {}) {
      const onSummon = vi.fn();
      const sheet = summon ?? linked();
      renderCard({ companion: sheet.companionCreature, summon: getSummonInfo(sheet, 7), onSummon, ...extra });
      await userEvent.click(screen.getByRole("button", { name: "Prepare summon" }));
      return onSummon;
    }

    it("shows no numbers while she isn't summoned, only Prepare summon", () => {
      const sheet = linked();
      renderCard({ companion: sheet.companionCreature, summon: getSummonInfo(sheet, 7) });
      expect(screen.getByText("Not summoned")).toBeInTheDocument();
      expect(screen.queryByLabelText("Fable's current HP")).toBeNull();
      expect(screen.queryByRole("button", { name: "Stats & saves" })).toBeNull();
      expect(screen.getByRole("button", { name: "Prepare summon" })).toHaveAttribute("aria-expanded", "false");
      // The setup isn't open (or spending anything) until asked for.
      expect(screen.queryByRole("button", { name: "Summon Fable" })).toBeNull();
    });

    it("picks the free cast first, with the cost, preview and choices as radio groups", async () => {
      await openSetup();
      expect(screen.getByRole("radio", { name: /Free cast/ })).toBeChecked();
      expect(screen.getByRole("group", { name: /Casting cost/ })).toBeInTheDocument();
      const moods = screen.getByRole("group", { name: /Fey mood/ });
      expect(moods).toHaveTextContent("Changes what happens after Fey Step.");
      // Each mood says it follows Fey Step, before anything is picked.
      for (const mood of ["Fuming", "Mirthful", "Tricksy"]) {
        expect(screen.getByRole("radio", { name: new RegExp(`${mood}.*After Fey Step:`) })).toBeInTheDocument();
      }
      expect(screen.getByRole("group", { name: /Duration/ })).toBeInTheDocument();
      expect(screen.getByText(/3rd level · 30 HP · AC 15 · Speed 40 ft · 1 attack \/ turn · up to 1 hour/)).toBeInTheDocument();
      expect(screen.getByText("Uses your free cast (cast at 3rd level).")).toBeInTheDocument();
    });

    it("changing mood, duration or how to pay casts nothing; only Summon does, once", async () => {
      const onSummon = await openSetup();
      await userEvent.click(screen.getByRole("radio", { name: /Tricksy/ }));
      expect(screen.getByText(/Tricksy:/).closest("p")).toHaveTextContent(/magical darkness/i);
      await userEvent.click(screen.getByRole("radio", { name: /1 minute · No concentration/ }));
      await userEvent.click(screen.getByRole("radio", { name: /Spell slot/ }));
      await userEvent.click(screen.getByRole("radio", { name: /Free cast/ }));
      expect(onSummon).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Summon Fable" }));
      expect(onSummon).toHaveBeenCalledTimes(1);
      expect(onSummon).toHaveBeenCalledWith("cast", { slotLevel: 3, payWith: "free", mood: "tricksy", concentration: false });
    });

    it("can cast with a higher slot, and the preview follows the level", async () => {
      const onSummon = await openSetup();
      await userEvent.click(screen.getByRole("radio", { name: /Spell slot/ }));
      await userEvent.selectOptions(screen.getByLabelText("Spell slot level"), "4");
      expect(screen.getByText(/4th level · 40 HP · AC 16 · Speed 40 ft · 2 attacks \/ turn/)).toBeInTheDocument();
      expect(screen.getByText("Uses one 4th-level spell slot.")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Summon Fable" }));
      expect(onSummon).toHaveBeenCalledWith("cast", expect.objectContaining({ slotLevel: 4, payWith: "slot", concentration: true }));
    });

    it("shows a used free cast as unavailable, and picks a slot instead", async () => {
      const used = applySummonAction(
        sheetWith({ resources: [{ id: "fc", name: "Summon Fey (free cast)", max: 1, current: 0, freeCastFor: "Summon Fey" }] }),
        "link",
        { template: "summonFey" },
      );
      await openSetup(used);
      const free = screen.getByRole("radio", { name: /Free cast/ });
      expect(free).toBeDisabled();
      expect(free.closest("label")).toHaveTextContent("Used · resets on a long rest");
      expect(screen.getByRole("radio", { name: /Spell slot/ })).toBeChecked();
      expect(screen.getByText("Uses one 3rd-level spell slot.")).toBeInTheDocument();
    });

    it("says why it can't be cast when nothing can pay for it", async () => {
      const broke = applySummonAction(
        sheetWith({
          spellcasting: { spellSlots: [{ level: 3, max: 3, current: 0 }] },
          resources: [{ id: "fc", name: "Summon Fey (free cast)", max: 1, current: 0, freeCastFor: "Summon Fey" }],
        }),
        "link",
        { template: "summonFey" },
      );
      const onSummon = await openSetup(broke);
      const summonButton = screen.getByRole("button", { name: "Summon Fable" });
      expect(summonButton).toBeDisabled();
      expect(summonButton).toHaveAccessibleDescription(/Nothing can pay for it/);
      expect(onSummon).not.toHaveBeenCalled();
    });

    it("shows one slot without a level picker when only one level can cast it", async () => {
      const oneLevel = applySummonAction(
        sheetWith({ spellcasting: { spellSlots: [{ level: 3, max: 3, current: 3 }] } }),
        "link",
        { template: "summonFey" },
      );
      await openSetup(oneLevel);
      expect(screen.getByRole("radio", { name: /3rd-level spell slot/ }).closest("label")).toHaveTextContent("3 of 3 available");
      expect(screen.queryByLabelText("Spell slot level")).toBeNull();
    });

    it("warns, by name, about the concentration casting it would end", async () => {
      const busy = applySummonAction(sheetWith({ concentration: { spell: "Hunter's Mark" } }), "link", { template: "summonFey" });
      await openSetup(busy);
      expect(screen.getByText(/Casting this ends your concentration on/)).toHaveTextContent("Hunter's Mark");
      // Without concentration, nothing ends.
      await userEvent.click(screen.getByRole("radio", { name: /1 minute · No concentration/ }));
      expect(screen.queryByText(/Casting this ends your concentration/)).toBeNull();
    });

    it("offers only concentration without Fey Reinforcements", async () => {
      const plain = applySummonAction(sheetWith({ features: [] }), "link", { template: "summonFey" });
      await openSetup(plain);
      expect(screen.queryByRole("radio", { name: /No concentration/ })).toBeNull();
      expect(screen.getByText("Up to 1 hour, with concentration.")).toBeInTheDocument();
    });

    it("Cancel closes the setup without casting and gives focus back to Prepare summon", async () => {
      const onSummon = await openSetup();
      await userEvent.click(screen.getByRole("radio", { name: /Mirthful/ }));
      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onSummon).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Summon Fable" })).toBeNull();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      expect(screen.getByRole("button", { name: "Prepare summon" })).toHaveFocus();
    });

    it("once summoned, shows the spell's numbers, her Bite, Fey Step and the duration", async () => {
      const onSummon = vi.fn();
      const sheet = applySummonAction(linked(), "cast", { payWith: "free", mood: "mirthful" });
      renderCard({ companion: sheet.companionCreature, summon: getSummonInfo(sheet, 7), onSummon, ownerName: "Pippa" });
      expect(screen.getByText("Summoned")).toBeInTheDocument();
      expect(screen.getByText("Fey Spirit · Summon Fey · Mirthful")).toBeInTheDocument();
      expect(screen.getByLabelText("Fable's current HP")).toHaveValue(30);
      expect(screen.getByText(/Acts right after Pippa/)).toBeInTheDocument();
      // Her own name for the attack is kept, not the spell's "Shortsword".
      const attack = screen.getByRole("group", { name: "Fable's attacks" });
      expect(attack).toHaveTextContent("Bite");
      expect(attack).toHaveTextContent("1 attack / turn");
      // Her renamed attack is a Bite, so it gets the bite picture.
      expect(attack.querySelector("svg.weapon-icon")).toHaveAttribute("data-icon", "bite");
      // (Roll buttons are plain text outside a sheet with a roller.)
      expect(attack).toHaveTextContent("+7 Roll");
      expect(attack).toHaveTextContent("1d6+6 piercing +1d6 force");
      // Fey Step in two short lines, with the full wording under Rules.
      expect(screen.getByText(/Teleport up to 30 ft/).closest("span")).toHaveTextContent(
        "Teleport up to 30 ft · Mirthful: may try to charm a creature within 10 ft",
      );
      const rules = screen.getByRole("button", { name: "Rules" });
      expect(rules).toHaveAttribute("aria-expanded", "false");
      expect(screen.getByText(/unoccupied space it can see/)).not.toBeVisible();
      await userEvent.click(rules);
      expect(rules).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText(/unoccupied space it can see/)).toHaveTextContent("Wisdom save against your spell save DC");
      expect(screen.getByText("Concentrating")).toBeInTheDocument();
      // No setup choices while she's here, and no saved attack list.
      expect(screen.queryByRole("button", { name: "Prepare summon" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Edit attacks" })).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: "Dismiss Fable" }));
      expect(onSummon).toHaveBeenCalledWith("dismiss");
    });

    it("after dismissal she's back to Not summoned", () => {
      const sheet = applySummonAction(applySummonAction(linked(), "cast", { payWith: "free" }), "dismiss");
      renderCard({ companion: sheet.companionCreature, summon: getSummonInfo(sheet, 7) });
      expect(screen.getByText("Not summoned")).toBeInTheDocument();
      expect(screen.queryByLabelText("Fable's current HP")).toBeNull();
      expect(screen.queryByRole("button", { name: "Dismiss Fable" })).toBeNull();
    });

    it("keeps each companion's setup to itself", async () => {
      const sheet = linked();
      renderCard({ companion: sheet.companionCreature, summon: getSummonInfo(sheet, 7) });
      renderCard({ companion: { ...sheet.companionCreature, id: "c2", name: "Puck" }, summon: getSummonInfo(sheet, 7) });
      await userEvent.click(screen.getAllByRole("button", { name: "Prepare summon" })[0]);
      expect(screen.getByRole("button", { name: "Summon Fable" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Summon Puck" })).toBeNull();
      expect(screen.getAllByRole("button", { name: "Prepare summon" })).toHaveLength(1);
    });

    it("is switched on and off under Edit stats; ordinary companions are unchanged", async () => {
      const onSummon = vi.fn();
      renderCard({ companion: fable, onSummon });
      expect(screen.getByLabelText("Fable's current HP")).toHaveValue(30);
      expect(screen.queryByRole("button", { name: "Use Summon Fey rules" })).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: "🔒 Edit stats" }));
      await userEvent.click(screen.getByRole("button", { name: "Use Summon Fey rules" }));
      expect(onSummon).toHaveBeenCalledWith("link", { template: "summonFey" });
    });
  });
});

describe("CompanionCard at a table", () => {
  async function renderAtTable(roller) {
    const { RollContext } = await import("../RollDock/rollContext");
    render(
      <RollContext.Provider value={{ roll: vi.fn(), rollDamage: vi.fn(), ...roller }}>
        <CompanionCard companion={wolf} onHpChange={vi.fn()} onFieldChange={vi.fn()} onNotesChange={vi.fn()} />
      </RollContext.Provider>,
    );
  }

  it("says shared rolls are resolved by the DM, once, with the details one tap away", async () => {
    await renderAtTable({ tableId: "t1", tableName: "Breakfast Club", sharing: true });
    expect(
      screen.getAllByText("Rolls are shared with your table. Your DM resolves the hit and applies damage.", { exact: false }),
    ).toHaveLength(1);
    const more = screen.getByRole("button", { name: "How companion rolls work" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/don't pick a target, start an attack at the table or deal damage/)).not.toBeVisible();
    await userEvent.click(more);
    expect(screen.getByText(/post the result to Breakfast Club's roll log/)).toBeVisible();
    // No Attack button that suggests a table workflow.
    expect(screen.queryByRole("button", { name: "Attack" })).toBeNull();
  });

  it("says rolls stay on screen when sharing is off", async () => {
    await renderAtTable({ tableId: "t1", tableName: "Breakfast Club", sharing: false });
    expect(
      screen.getByText(/Rolls stay on your screen\. Tell your DM the result so they can resolve the hit and damage\./),
    ).toBeInTheDocument();
  });

  it("says nothing away from a table", async () => {
    await renderAtTable({ tableId: null, sharing: false });
    expect(screen.queryByText(/Rolls are shared|Rolls stay on your screen/)).toBeNull();
  });
});

describe("CompanionCard: weapon pictures", () => {
  const pictureFor = (name) =>
    screen
      .getByText((text, element) => element.classList.contains("character-sheet__item-label") && text === name)
      .closest(".character-sheet__attacks-row")
      .querySelector("svg.weapon-icon");

  it("uses a natural attack's picture only for its exact name, else the plain one", () => {
    renderCard({
      userId: "u1",
      characterId: "c1",
      onPortraitUpload: vi.fn(),
      companion: {
        ...wolf,
        portraitUrl: "https://example.test/victory.png",
        attacks: [
          { id: "a1", name: "Bite", toHit: 4, damage: "2d4+2", damageType: "Piercing" },
          { id: "a2", name: "Claws", toHit: 4, damage: "1d6+2", damageType: "Slashing" },
          { id: "a3", name: "Talons", toHit: 4, damage: "1d4+2", damageType: "Slashing" },
          { id: "a4", name: "Savage Bite of the Pack", toHit: 4, damage: "1d4", damageType: "Piercing" },
        ],
      },
    });
    expect(pictureFor("Bite")).toHaveAttribute("data-icon", "bite");
    expect(pictureFor("Claws")).toHaveAttribute("data-icon", "claw");
    expect(pictureFor("Talons")).toHaveAttribute("data-icon", "claw");
    expect(pictureFor("Savage Bite of the Pack")).toHaveAttribute("data-icon", "custom-weapon");
    expect(pictureFor("Bite")).toHaveAttribute("aria-hidden", "true");
    // The uploaded portrait is left as it is.
    expect(screen.getByRole("button", { name: "Change Victory's picture" })).toBeInTheDocument();
    expect(document.querySelector('img[src="https://example.test/victory.png"]')).not.toBeNull();
  });
});

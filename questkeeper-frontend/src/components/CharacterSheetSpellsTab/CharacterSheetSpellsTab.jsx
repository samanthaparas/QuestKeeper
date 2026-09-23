import { useEffect, useState } from "react";
import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { findSrdMatches, formatSpellDetails } from "../../utils/srdDetails";
import { getSpells, getSpellDetails } from "../../utils/api";
import {
  ABILITY_ABBREVIATIONS,
  getSpellSaveDC,
  getSpellAttackModifier,
  getSpellSlots,
  formatModifier,
} from "../../utils/characterSheet";

function CharacterSheetSpellsTab({
  spellcasting,
  spellcastingAbility,
  abilityScore,
  proficiencyBonus,
  activeSlotLevels,
  onSpellSlotChange,
  onShowSlotLevel,
  onHideSlotLevel,
  onSpellAdd,
  onSpellUpdate,
  onSpellRemove,
}) {
  const [allSpells, setAllSpells] = useState([]);
  const [detailView, setDetailView] = useState(null);

  useEffect(() => {
    getSpells()
      .then(setAllSpells)
      .catch(() => {
        // Autocomplete is a nice-to-have - freeform entry still works if this fails.
      });
  }, []);

  function getSpellAutofill(name) {
    const match = allSpells.find(
      (spell) => spell.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!match) return null;

    return getSpellDetails(match.index)
      .then((details) => ({
        level: String(match.level),
        components: (details.components ?? []).join(", "),
      }))
      .catch(() => null);
  }

  function openSpellDetails(spell) {
    const matches = findSrdMatches(spell.name, allSpells);
    const title = matches[0].name;
    setDetailView({ title, status: "loading", details: [] });

    Promise.all(matches.map((match) => getSpellDetails(match.index)))
      .then((results) =>
        setDetailView((current) =>
          current?.title === title
            ? {
                title,
                status: "ready",
                details: results.map(formatSpellDetails),
              }
            : current,
        ),
      )
      .catch(() =>
        setDetailView((current) =>
          current?.title === title
            ? { title, status: "error", details: [] }
            : current,
        ),
      );
  }

  const slots = getSpellSlots(spellcasting);

  return (
    <>
      {spellcastingAbility && (
        <section className="character-sheet__section">
          <h2 className="character-sheet__section-title">Spellcasting</h2>
          <div className="character-sheet__hero-row">
            <div className="character-sheet__stat-box">
              <span className="character-sheet__stat-label">
                Spellcasting Ability
              </span>
              <span className="character-sheet__stat-value">
                {ABILITY_ABBREVIATIONS[spellcastingAbility]}
              </span>
            </div>
            <div className="character-sheet__stat-box">
              <span className="character-sheet__stat-label">Spell Save DC</span>
              <span className="character-sheet__stat-value">
                {getSpellSaveDC(abilityScore, proficiencyBonus)}
              </span>
            </div>
            <div className="character-sheet__stat-box">
              <span className="character-sheet__stat-label">Spell Attack</span>
              <span className="character-sheet__stat-value">
                {formatModifier(
                  getSpellAttackModifier(abilityScore, proficiencyBonus),
                )}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Spell Slots</h2>

        <ul className="character-sheet__spell-slots-grid">
          {slots
            .filter((slot) => activeSlotLevels.has(slot.level))
            .map((slot) => (
              <li className="character-sheet__spell-slot-card" key={slot.level}>
                <span className="character-sheet__spell-slot-label">
                  Level {slot.level}
                </span>
                <span className="character-sheet__spell-slot-count">
                  <input
                    type="number"
                    className="character-sheet__hp-input character-sheet__hp-input--tiny"
                    value={slot.current}
                    onChange={(e) =>
                      onSpellSlotChange(slot.level, "current", e.target.value)
                    }
                    min={0}
                    max={slot.max}
                  />
                  {" / "}
                  <input
                    type="number"
                    className="character-sheet__hp-input character-sheet__hp-input--tiny"
                    value={slot.max}
                    onChange={(e) =>
                      onSpellSlotChange(slot.level, "max", e.target.value)
                    }
                    min={0}
                  />
                </span>
                <button
                  type="button"
                  className="character-sheet__resource-remove"
                  onClick={() => onHideSlotLevel(slot.level)}
                >
                  Hide
                </button>
              </li>
            ))}
        </ul>

        {slots.some((slot) => !activeSlotLevels.has(slot.level)) && (
          <div className="character-sheet__resource-form">
            {slots
              .filter((slot) => !activeSlotLevels.has(slot.level))
              .map((slot) => (
                <button
                  type="button"
                  key={slot.level}
                  className="character-sheet__resource-remove"
                  onClick={() => onShowSlotLevel(slot.level)}
                >
                  + Level {slot.level}
                </button>
              ))}
          </div>
        )}
      </section>

      <EditableItemList
        title="Spells"
        items={[
          ...(spellcasting?.cantripsKnown ?? []),
          ...(spellcasting?.spellsKnown ?? []),
        ].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))}
        getItemId={(item) => item.index}
        fields={[
          {
            key: "name",
            type: "text",
            placeholder: "Spell name (e.g. Bless)",
            datalistId: "spell-name-suggestions",
            datalistOptions: allSpells.map((spell) => spell.name),
            getAutofill: getSpellAutofill,
          },
          {
            key: "level",
            type: "select",
            defaultValue: "0",
            options: [
              { value: "0", label: "Cantrip" },
              ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => ({
                value: String(lvl),
                label: `Level ${lvl}`,
              })),
            ],
          },
          {
            key: "components",
            type: "text",
            placeholder: "Components (V, S, M)",
            width: "large",
          },
          {
            key: "notes",
            type: "textarea",
            placeholder: "Notes (optional) - one line per bullet point",
          },
        ]}
        emptyText="No spells recorded yet."
        addButtonLabel="Add Spell"
        onAdd={onSpellAdd}
        onUpdate={onSpellUpdate}
        onRemove={onSpellRemove}
        isNameClickable={(spell) =>
          findSrdMatches(spell.name, allSpells).length > 0
        }
        onNameClick={openSpellDetails}
        extraRowContent={(spell) => (
          <>
            <span className="character-sheet__resource-reset">
              {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
            </span>
            {spell.components && (
              <span className="character-sheet__resource-reset">
                {spell.components}
              </span>
            )}
          </>
        )}
      />
      <SrdDetailDialog view={detailView} onClose={() => setDetailView(null)} />
    </>
  );
}

export default CharacterSheetSpellsTab;

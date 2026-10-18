import { useEffect, useState } from "react";
import UsePips, { MAX_PIPS } from "../UsePips/UsePips";
import RollButton from "../RollDock/RollButton";
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
  describeSpellLock,
  getSafeSpellLink,
} from "../../utils/characterSheet";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { spellsMissingComponents } from "../../utils/spellComponents";

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
  onSpellLockToggle,
  // When the class's own spellcasting hasn't started yet (a level 1 Ranger):
  // { className, level }. Null otherwise.
  spellsStartAt = null,
  // Fills in V, S, M from the SRD for spells that have none.
  onFillComponents = null,
}) {
  const [allSpells, setAllSpells] = useState([]);
  const detailView = useSrdDetailView();

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

  // Spells added without components (older characters' starting spells).
  const findSrdIndex = (name) =>
    allSpells.find((spell) => spell.name.toLowerCase() === String(name).trim().toLowerCase())?.index ?? null;
  const missingComponents = spellsMissingComponents(spellcasting, findSrdIndex).length;
  const [isFilling, setIsFilling] = useState(false);

  async function fillComponents() {
    setIsFilling(true);
    try {
      await onFillComponents?.(findSrdIndex);
    } finally {
      setIsFilling(false);
    }
  }

  function openSpellDetails(spell) {
    const matches = findSrdMatches(spell.name, allSpells);
    detailView.open(matches[0].name, () =>
      Promise.all(
        matches.map((match) =>
          getSpellDetails(match.index).then(formatSpellDetails),
        ),
      ),
    );
  }

  const slots = getSpellSlots(spellcasting);

  return (
    <>
      {spellcastingAbility && (
        <section className="character-sheet__section">
          <h2 className="character-sheet__section-title">Spellcasting</h2>
          {spellsStartAt && (
            <p className="character-sheet__spells-not-yet" role="note">
              {spellsStartAt.className} spellcasting starts at level {spellsStartAt.level}, so
              there are no spell slots or spells from your class yet. Anything you add
              below is by hand (for house rules or other features).
            </p>
          )}
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
              {/* Tap to roll a spell attack. */}
              <RollButton
                label="Spell attack"
                bonus={getSpellAttackModifier(abilityScore, proficiencyBonus)}
                className="character-sheet__stat-value"
              >
                {formatModifier(
                  getSpellAttackModifier(abilityScore, proficiencyBonus),
                )}
              </RollButton>
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
                {/* Tap a pip to spend a slot or get one back. */}
                {slot.max > 0 && slot.max <= MAX_PIPS ? (
                  <UsePips
                    label={`Level ${slot.level} spell slots`}
                    current={slot.current}
                    max={slot.max}
                    onChange={(value) =>
                      onSpellSlotChange(slot.level, "current", value)
                    }
                  />
                ) : (
                  <input
                    type="number"
                    className="character-sheet__hp-input character-sheet__hp-input--tiny"
                    aria-label={`Level ${slot.level} slots left`}
                    value={slot.current}
                    onChange={(e) =>
                      onSpellSlotChange(slot.level, "current", e.target.value)
                    }
                    min={0}
                    max={slot.max}
                  />
                )}
                {/* How many slots of this level you have (Level Up sets it). */}
                <label className="character-sheet__spell-slot-max">
                  Max
                  <input
                    type="number"
                    className="character-sheet__hp-input character-sheet__hp-input--tiny"
                    value={slot.max}
                    onChange={(e) =>
                      onSpellSlotChange(slot.level, "max", e.target.value)
                    }
                    min={0}
                  />
                </label>
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

      {/* Older starting spells were saved without V, S, M. One tap fills
          them from the SRD; components someone typed are never changed. */}
      {onFillComponents && missingComponents > 0 && (
        <p className="character-sheet__fill-components">
          {missingComponents === 1 ? "1 spell is" : `${missingComponents} spells are`} missing
          {" "}components (V, S, M).{" "}
          <button type="button" onClick={fillComponents} disabled={isFilling}>
            {isFilling ? "Filling in…" : "Fill in from the SRD"}
          </button>
        </p>
      )}

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
            // Book spells aren't in the SRD: a link to where they're written
            // up (like dnd5e.wikidot.com), never the book's own text.
            key: "link",
            type: "url",
            placeholder: "Book link (optional)",
            width: "large",
            getHint: (values) =>
              values.name?.trim() && !findSrdIndex(values.name)
                ? "Not an SRD spell? Type its level and components yourself, and paste a link to where it's written up if you like."
                : "",
          },
          {
            key: "bonusSpell",
            type: "checkbox",
            label: "Doesn't count toward spells known",
            getHint: (values) =>
              values.bonusSpell
                ? "For spells a subclass or feature gives you for free (Fey Wanderer Magic, Primal Awareness). Level-up won't count them."
                : "",
          },
          {
            key: "notes",
            type: "textarea",
            placeholder: "Notes (optional) - one line per bullet point",
          },
        ]}
        emptyText="Add the spells your character knows or has prepared. Tap Add Spell and start typing a name: an SRD spell's level and components fill in for you. Book spells can be typed in with a link."
        addButtonLabel="Add Spell"
        onAdd={onSpellAdd}
        onUpdate={onSpellUpdate}
        onRemove={onSpellRemove}
        isLocked={(spell) => Boolean(spell.locked)}
        onToggleLock={onSpellLockToggle}
        isNameClickable={(spell) =>
          findSrdMatches(spell.name, allSpells).length > 0
        }
        onNameClick={openSpellDetails}
        extraRowContent={(spell) => (
          <>
            {spell.locked && (
              <span className="character-sheet__lock-tag">
                🔒 {describeSpellLock(spell)}
              </span>
            )}
            <span className="character-sheet__resource-reset">
              {spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
            </span>
            {spell.bonusSpell && (
              <span
                className="character-sheet__resource-reset"
                title="Doesn't count toward spells known"
              >
                Bonus
              </span>
            )}
            {getSafeSpellLink(spell.link) && (
              <a
                className="character-sheet__spell-link"
                href={getSafeSpellLink(spell.link)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book link
              </a>
            )}
            {spell.components && (
              <span className="character-sheet__resource-reset">
                {spell.components}
              </span>
            )}
          </>
        )}
      />
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </>
  );
}

export default CharacterSheetSpellsTab;

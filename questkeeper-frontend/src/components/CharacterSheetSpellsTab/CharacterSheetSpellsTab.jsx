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

// "1st", "2nd", "3rd", "4th"... for the slot chips.
function ordinal(level) {
  return `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"}`;
}

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
  // Slots' Max boxes, Hide and "+ Level N" show only while editing.
  const [isEditingSlots, setIsEditingSlots] = useState(false);

  return (
    <>
      {/* Spellcasting and slots in one section: the three numbers on a single
          line, then one small chip per slot level, so even a level 9 caster's
          slots take a couple of short rows and the spells stay close. */}
      <section className="character-sheet__section">
        <div className="character-sheet__spellcasting-head">
          <h2 className="character-sheet__section-title">Spellcasting</h2>
          {spellcastingAbility && (
            <div className="character-sheet__spell-stats">
              <span className="character-sheet__spell-stat">
                <span className="character-sheet__spell-stat-label">Ability</span>{" "}
                {ABILITY_ABBREVIATIONS[spellcastingAbility]}
              </span>
              <span className="character-sheet__spell-stat">
                <span className="character-sheet__spell-stat-label">Save DC</span>{" "}
                {getSpellSaveDC(abilityScore, proficiencyBonus)}
              </span>
              <span className="character-sheet__spell-stat">
                <span className="character-sheet__spell-stat-label">Attack</span>{" "}
                {/* Tap to roll a spell attack. */}
                <RollButton
                  label="Spell attack"
                  bonus={getSpellAttackModifier(abilityScore, proficiencyBonus)}
                  className="character-sheet__spell-stat-roll"
                >
                  {formatModifier(getSpellAttackModifier(abilityScore, proficiencyBonus))}
                </RollButton>
              </span>
            </div>
          )}
        </div>

        {spellcastingAbility && spellsStartAt && (
          <p className="character-sheet__spells-not-yet" role="note">
            {spellsStartAt.className} spellcasting starts at level {spellsStartAt.level}, so
            there are no spell slots or spells from your class yet. Anything you add
            below is by hand (for house rules or other features).
          </p>
        )}

        <div className="character-sheet__spell-slots-bar">
          <span className="character-sheet__spell-stat-label">Slots</span>
          {/* role="list" keeps it a list for screen readers; its chips flow
              in one line with the label and Edit slots. */}
          <ul className="character-sheet__spell-slot-chips" role="list">
            {slots
              .filter((slot) => activeSlotLevels.has(slot.level))
              .map((slot) => (
                <li
                  className={`character-sheet__spell-slot-chip${
                    slot.max === 0 ? " character-sheet__spell-slot-chip--empty" : ""
                  }`}
                  key={slot.level}
                >
                  <span className="character-sheet__spell-slot-level">{ordinal(slot.level)}</span>
                  {/* Tap a pip to spend a slot or get one back. */}
                  {slot.max > 0 && slot.max <= MAX_PIPS ? (
                    <UsePips
                      compact
                      label={`Level ${slot.level} spell slots`}
                      current={slot.current}
                      max={slot.max}
                      onChange={(value) => onSpellSlotChange(slot.level, "current", value)}
                    />
                  ) : slot.max > 0 ? (
                    <span className="character-sheet__spell-slot-count">
                      <input
                        type="number"
                        className="character-sheet__hp-input character-sheet__hp-input--tiny"
                        aria-label={`Level ${slot.level} slots left`}
                        value={slot.current}
                        onChange={(e) => onSpellSlotChange(slot.level, "current", e.target.value)}
                        min={0}
                        max={slot.max}
                      />
                      /{slot.max}
                    </span>
                  ) : (
                    <span className="character-sheet__spell-slot-none">none</span>
                  )}
                  {/* Max and Hide are rarely needed (Level Up sets the max), so
                      they only show while editing. */}
                  {isEditingSlots && (
                    <>
                      <label className="character-sheet__spell-slot-max">
                        Max
                        <input
                          type="number"
                          className="character-sheet__hp-input character-sheet__hp-input--tiny"
                          value={slot.max}
                          onChange={(e) => onSpellSlotChange(slot.level, "max", e.target.value)}
                          min={0}
                        />
                      </label>
                      <button
                        type="button"
                        className="character-sheet__spell-slot-hide"
                        aria-label={`Hide level ${slot.level} slots`}
                        onClick={() => onHideSlotLevel(slot.level)}
                      >
                        ×
                      </button>
                    </>
                  )}
                </li>
              ))}
          </ul>
          <button
            type="button"
            className="character-sheet__spell-slot-edit"
            aria-expanded={isEditingSlots}
            onClick={() => setIsEditingSlots((editing) => !editing)}
          >
            {isEditingSlots ? "Done" : "Edit slots"}
          </button>
        </div>

        {isEditingSlots && slots.some((slot) => !activeSlotLevels.has(slot.level)) && (
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
        // By level (cantrips first), then A to Z, so a level is easy to scan.
        items={[
          ...(spellcasting?.cantripsKnown ?? []),
          ...(spellcasting?.spellsKnown ?? []),
        ].sort(
          (a, b) =>
            (a.level ?? 0) - (b.level ?? 0) ||
            String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, { sensitivity: "base" }),
        )}
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
        // Lock, Unlock, the pencil and the trash wait behind "Edit spells",
        // so in play each row is just level, name and what helps at the table.
        hasEditToggle
        editToggleLabel="Edit spells"
        leadingContent={(spell) => (
          <span
            className="character-sheet__spell-level-pill"
            aria-label={spell.level === 0 ? "Cantrip" : `Level ${spell.level}`}
          >
            {spell.level === 0 ? "Cantrip" : `Lv ${spell.level}`}
          </span>
        )}
        isNameClickable={(spell) =>
          findSrdMatches(spell.name, allSpells).length > 0
        }
        onNameClick={openSpellDetails}
        extraRowContent={(spell, { isEditMode: isEditingSpells } = {}) => (
          <>
            {/* Where a spell came from always shows; a plain lock only
                matters while editing. */}
            {spell.locked && (spell.grantedBy || isEditingSpells) && (
              <span className="character-sheet__lock-tag">
                {spell.grantedBy ? describeSpellLock(spell) : `🔒 ${describeSpellLock(spell)}`}
              </span>
            )}
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
              <span className="character-sheet__spell-components" title="Components">
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

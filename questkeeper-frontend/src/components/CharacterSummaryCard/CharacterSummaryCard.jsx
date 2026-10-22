import { useId, useState } from "react";
import {
  ABILITY_SCORES,
  ABILITY_ABBREVIATIONS,
  getAbilityModifier,
  formatModifier,
  getEffectiveArmorClass,
  getCompanions,
  getSpellNumbers,
  getSpellcastingAbility,
  getSpellSlots,
  getAttunedCount,
  getPreparedLimit,
  countPreparedSpells,
  countsTowardSpellsKnown,
  isSpellPrepared,
} from "../../utils/characterSheet";
import { describeDamageParts, getActiveEffects, getEffectiveAttack, getOnHitFeatures } from "../../utils/combatEffects";
import { toCompanionRow } from "../../utils/partyStrip";
import ConditionBadges from "../ConditionBadges/ConditionBadges";
import RulesText from "../RulesText/RulesText";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { getSpellDetails, getSpells } from "../../utils/api";
import { findSrdMatches, formatSpellDetails } from "../../utils/srdDetails";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import "./CharacterSummaryCard.css";

function itemName(item) {
  return typeof item === "string" ? item : (item?.name ?? "Unnamed");
}

// The player's own note on a spell, item or feature (one line per bullet).
// Only these notes are shown here, never their personal journal.
function noteLinesOf(item) {
  const text = typeof item === "string" ? "" : (item?.description ?? item?.notes ?? "");
  return String(text)
    .split("\n")
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);
}

function NoteLines({ lines }) {
  return (
    <ul className="character-summary__note-lines">
      {lines.map((line, index) => (
        <li key={index}>
          <RulesText text={line} />
        </li>
      ))}
    </ul>
  );
}

// Names, with the player's own note opening under any item or feature that
// has one, so the DM can read it without asking.
function NameList({ title, items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="character-summary__block">
      <h4 className="character-summary__block-title">{title}</h4>
      <ul className="character-summary__list">
        {items.map((item, index) => {
          const label = `${itemName(item)}${item?.quantity > 1 ? ` x${item.quantity}` : ""}${item?.attuned ? " (attuned)" : ""}`;
          const lines = noteLinesOf(item);
          return (
            <li key={item?.id ?? `${itemName(item)}-${index}`}>
              {lines.length > 0 ? (
                <details className="character-summary__entry">
                  <summary>{label}</summary>
                  <NoteLines lines={lines} />
                </details>
              ) : (
                label
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ORDINALS = ["Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
const ABILITY_NAMES = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

// The numbers the DM needs to run a caster: save DC and spell attack (from
// their spellcasting ability, level and items like a Moon Sickle), slots left at each level, what
// they're concentrating on, and spells changing their attacks right now.
function SpellcastingSummary({ sheet }) {
  const ability = sheet.class?.spellcastingAbility ?? getSpellcastingAbility(sheet.class ?? null);
  const slots = getSpellSlots(sheet.spellcasting).filter((slot) => slot.max > 0);
  const concentration = sheet.concentration?.spell;
  const effects = getActiveEffects(sheet);
  if (!ability && slots.length === 0 && !concentration && effects.length === 0) return null;
  const numbers = getSpellNumbers(sheet);
  return (
    <div className="character-summary__block">
      {ability && (
        <p className="character-summary__spell-numbers">
          <span>
            Spell save DC <b>{numbers?.saveDc}</b>
          </span>
          <span>
            Spell attack <b>{formatModifier(numbers?.spellAttack ?? 0)}</b>
          </span>
          <span>{ABILITY_NAMES[ability] ?? ability}</span>
        </p>
      )}
      {getPreparedLimit(sheet) && (
        <p className="character-summary__slots">
          Prepared spells: <b>{countPreparedSpells(sheet.spellcasting)}</b>/{getPreparedLimit(sheet).limit}
        </p>
      )}
      {slots.length > 0 && (
        <p className="character-summary__slots">
          Slots left:{" "}
          {slots.map((slot, index) => (
            <span key={slot.level}>
              {index > 0 ? " · " : ""}
              {ORDINALS[slot.level]} <b>{slot.current}</b>/{slot.max}
            </span>
          ))}
        </p>
      )}
      {concentration && (
        <p className="character-summary__slots">
          🎯 Concentrating on <b>{concentration}</b>
          {typeof sheet.concentration?.rounds === "number" ? ` (${sheet.concentration.rounds} rounds left)` : ""}
        </p>
      )}
      {effects.map((effect) => (
        <p className="character-summary__slots" key={effect.id}>
          ✨ {effect.spell}
          {effect.damageType ? ` (${String(effect.damageType).toLowerCase()})` : ""}
          {effect.attackName ? ` on ${effect.attackName}` : ""}
        </p>
      ))}
    </div>
  );
}

// Known spells grouped by level. Tap a spell to read the player's own note on
// it, and its full rules text, without leaving the table.
function SpellsByLevel({ spellcasting, prepares = false }) {
  const [openKey, setOpenKey] = useState(null);
  const detailView = useSrdDetailView();
  const panelId = useId();
  const spells = [...(spellcasting?.cantripsKnown ?? []), ...(spellcasting?.spellsKnown ?? [])];
  if (spells.length === 0) return null;
  const levels = [...new Set(spells.map((spell) => Number(spell?.level) || 0))].sort((a, b) => a - b);
  const keyOf = (spell) => `${Number(spell?.level) || 0}:${spell?.index ?? itemName(spell)}`;
  const open = spells.find((spell) => keyOf(spell) === openKey) ?? null;

  // The SRD's text, fetched only when asked for (the list loads on tap, so
  // a table with many players doesn't fetch it for every card).
  function openRules(spell) {
    detailView.open(itemName(spell), async () => {
      const matches = findSrdMatches(itemName(spell), await getSpells());
      if (matches.length === 0) throw new Error("Not an SRD spell");
      return Promise.all(matches.map((match) => getSpellDetails(match.index).then(formatSpellDetails)));
    });
  }

  const noteLines = open ? noteLinesOf(open) : [];
  return (
    <div className="character-summary__block">
      <h4 className="character-summary__block-title">Spells</h4>
      <ul className="character-summary__list">
        {levels.map((level) => (
          <li key={level}>
            <b>{level === 0 ? "Cantrips" : ORDINALS[level]}:</b>{" "}
            <span className="character-summary__spell-chips">
              {spells
                .filter((spell) => (Number(spell?.level) || 0) === level)
                .map((spell) => {
                  // A caster who prepares: spells not ready today are dimmed.
                  const resting = prepares && (Number(spell.level) || 0) > 0 && countsTowardSpellsKnown(spell) && !isSpellPrepared(spell);
                  return (
                  <button
                    key={keyOf(spell)}
                    type="button"
                    className={`character-summary__spell${resting ? " character-summary__spell--resting" : ""}`}
                    title={resting ? "In their spellbook or list, but not prepared today" : undefined}
                    aria-expanded={keyOf(spell) === openKey}
                    aria-controls={panelId}
                    onClick={() => setOpenKey(keyOf(spell) === openKey ? null : keyOf(spell))}
                  >
                    {itemName(spell)}
                    {resting ? " (not prepared)" : ""}
                  </button>
                  );
                })}
            </span>
          </li>
        ))}
      </ul>
      {open && (
        <div id={panelId} className="character-summary__spell-detail" role="region" aria-label={`${itemName(open)} details`}>
          <p className="character-summary__spell-title">
            <b>{itemName(open)}</b> · {(Number(open.level) || 0) === 0 ? "Cantrip" : `${ORDINALS[Number(open.level)]} level`}
          </p>
          {open.components && (
            <p className="character-summary__slots">
              Components: {Array.isArray(open.components) ? open.components.join(", ") : open.components}
            </p>
          )}
          {noteLines.length > 0 ? (
            <NoteLines lines={noteLines} />
          ) : (
            <p className="character-summary__empty">No note from the player on this spell.</p>
          )}
          <button type="button" className="character-summary__rules-button" onClick={() => openRules(open)}>
            Full spell text
          </button>
        </div>
      )}
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </div>
  );
}

// A READ-ONLY summary of a player's character for the DM. There is nothing
// editable here on purpose; DMs can see everything but never change a sheet.
// bannedChoices: what this character uses that the DM's table doesn't allow
// (see utils/contentRules.js), flagged at the top.
function CharacterSummaryCard({ sheet, playerName, bannedChoices = [] }) {
  const hitPoints = sheet.combat?.hitPoints ?? {
    current: 0,
    max: 0,
    temporary: 0,
  };
  const spellcasting = sheet.spellcasting;

  return (
    <article className="character-summary">
      <header className="character-summary__header">
        {/* The character's portrait, or their initials without one. */}
        <span className="character-summary__portrait" aria-hidden="true">
          <CharacterAvatar character={sheet} />
        </span>
        <div className="character-summary__who">
          <h3 className="character-summary__name">{sheet.name}</h3>
          <p className="character-summary__meta">
            Level {sheet.level} · {sheet.race?.name ?? "No race"} ·{" "}
            {sheet.class?.name ?? "No class"}
            {sheet.background?.name ? ` · ${sheet.background.name}` : ""}
          </p>
          {playerName && (
            <p className="character-summary__player">Player: {playerName}</p>
          )}
        </div>
        <span className="character-summary__badge">View only</span>
      </header>

      {bannedChoices.length > 0 && (
        <p className="character-summary__flag" role="note">
          ⚠ Uses options not allowed at this table: {bannedChoices.map((item) => `${item.name} (${item.label})`).join(", ")}
        </p>
      )}

      {/* Conditions the player has marked (Prone, Poisoned...). */}
      <ConditionBadges conditions={sheet.conditions ?? []} readOnly />

      <div className="character-summary__stats">
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">HP</span>
          <span className="character-summary__stat-value">
            {hitPoints.current}/{hitPoints.max}
            {hitPoints.temporary > 0 ? ` (+${hitPoints.temporary})` : ""}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">AC</span>
          <span className="character-summary__stat-value">
            {getEffectiveArmorClass(sheet)}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">Speed</span>
          <span className="character-summary__stat-value">
            {sheet.combat?.speed ?? 30}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">Init</span>
          <span className="character-summary__stat-value">
            {formatModifier(sheet.combat?.initiative ?? 0)}
          </span>
        </div>
        <div className="character-summary__stat">
          <span className="character-summary__stat-label">Inspiration</span>
          <span className="character-summary__stat-value">
            {sheet.inspiration > 0 ? "Yes" : "No"}
          </span>
        </div>
      </div>

      <ul className="character-summary__abilities">
        {ABILITY_SCORES.map((ability) => {
          const score = sheet.abilityScores?.[ability] ?? 10;
          return (
            <li className="character-summary__ability" key={ability}>
              <span className="character-summary__ability-name">
                {ABILITY_ABBREVIATIONS[ability]}
              </span>
              <span className="character-summary__ability-score">{score}</span>
              <span className="character-summary__ability-mod">
                {formatModifier(getAbilityModifier(score))}
              </span>
            </li>
          );
        })}
      </ul>

      <details className="character-summary__section" open>
        <summary>Attacks and spells</summary>
        {/* Attacks as they are right now: magic, every damage type,
            damage that applies only sometimes, and spells on them. */}
        {(sheet.attacks ?? []).length > 0 && (
          <ul className="character-summary__list">
            {sheet.attacks.map((attack) => {
              const live = getEffectiveAttack(sheet, attack);
              return (
                <li key={attack.index ?? attack.id ?? attack.name}>
                  <b>
                    {attack.name}
                    {live.isMagicWeapon || live.isEnchanted ? " ✨" : ""}
                  </b>
                  : {formatModifier(live.toHit)} to hit
                  {describeDamageParts(live.damageParts) ? `, ${describeDamageParts(live.damageParts)}` : ""}
                  {live.optionalParts.map((part) => ` (+${part.dice} ${part.type} ${part.condition})`).join("")}
                </li>
              );
            })}
          </ul>
        )}
        {/* Damage they can add on a hit (Dreadful Strikes). */}
        {getOnHitFeatures(sheet).map((feature) => (
          <p className="character-summary__slots" key={feature.key}>
            On a hit: {feature.name} +{feature.dice} {feature.type} ({feature.note.replace(/\.$/, "").toLowerCase()})
          </p>
        ))}
        <SpellcastingSummary sheet={sheet} />
        <SpellsByLevel spellcasting={spellcasting} prepares={Boolean(getPreparedLimit(sheet))} />
        {(sheet.attacks ?? []).length === 0 && !spellcasting && (
          <p className="character-summary__empty">Nothing listed.</p>
        )}
      </details>

      {/* Their companions (a mount, a familiar, a summon): HP and AC. */}
      {getCompanions(sheet).length > 0 && (
        <details className="character-summary__section" open>
          <summary>Companions</summary>
          <ul className="character-summary__list">
            {getCompanions(sheet).map((creature) => {
              // The party strip's numbers: a summon's come from its spell,
              // and it only has them while it's summoned.
              const row = toCompanionRow({ ...sheet, companionMode: "creature", companionCreature: creature });
              return (
                <li key={creature.id}>
                  <b>{creature.name || "Companion"}</b>
                  {row ? `: HP ${row.hp.current}/${row.hp.max}, AC ${row.armorClass}` : ": not summoned right now"}
                  {creature.summon && row ? " · summoned" : ""}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <details className="character-summary__section">
        <summary>Inventory</summary>
        <p className="character-summary__slots">Attuned items: {getAttunedCount(sheet.equipment)}/3</p>
        <NameList title="Equipment" items={sheet.equipment} />
        {(sheet.equipment ?? []).length === 0 && (
          <p className="character-summary__empty">Nothing listed.</p>
        )}
        <p className="character-summary__gold">Gold: {sheet.gold ?? 0}</p>
      </details>

      <details className="character-summary__section">
        <summary>Features, feats and resources</summary>
        <NameList title="Features" items={sheet.features} />
        <NameList title="Feats" items={sheet.feats} />
        {(sheet.resources ?? []).length > 0 && (
          <div className="character-summary__block">
            <h4 className="character-summary__block-title">Resources</h4>
            <ul className="character-summary__list">
              {sheet.resources.map((resource) => (
                <li key={resource.id}>
                  {resource.name}: {resource.current}/{resource.max}
                </li>
              ))}
            </ul>
          </div>
        )}
      </details>

      <details className="character-summary__section">
        <summary>Story and notes</summary>
        {sheet.backstory ? (
          <p className="character-summary__text">{sheet.backstory}</p>
        ) : (
          <p className="character-summary__empty">No backstory written.</p>
        )}
        {sheet.appearance && (
          <p className="character-summary__text">{sheet.appearance}</p>
        )}
        {sheet.notes && (
          <p className="character-summary__text">{sheet.notes}</p>
        )}
      </details>
    </article>
  );
}

export default CharacterSummaryCard;

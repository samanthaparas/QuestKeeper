import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  ABILITY_SCORES,
  ABILITY_ABBREVIATIONS,
  SKILLS,
  getAbilityModifier,
  getSkillModifier,
  getSaveModifier,
  getProficiencyBonus,
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
import { getPassiveScore, getSenses, toCompanionRow } from "../../utils/partyStrip";
import ConditionBadges from "../ConditionBadges/ConditionBadges";
import RulesText from "../RulesText/RulesText";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import { getSpellDetails, getSpells } from "../../utils/api";
import { findSrdMatches, formatSpellDetails } from "../../utils/srdDetails";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import { getMagicItemIcon } from "../../utils/icons";
import "./CharacterSummaryCard.css";
import InlineLoading from "../StatusNote/InlineLoading";

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

// A small box that reads out what an attack or spell is. It shows while the
// pointer or the keyboard is on the item or the box itself (so you can move
// into it and press its button); a click or Enter keeps it open. Escape, or a
// click elsewhere, closes it, and Escape puts the keyboard back on the item.
// The box floats above everything else, so no panel's scrolling can cut it
// off, and it follows its item if the page or a panel scrolls underneath.
function Peek({ label, className, trigger, children }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [place, setPlace] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const boxRef = useRef(null);
  const leaveTimer = useRef(null);
  const skipFocus = useRef(false);
  const boxId = useId();
  const open = hover || focus || pinned;

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // Closing on a click anywhere else.
  useEffect(() => {
    if (!pinned) return undefined;
    function away(event) {
      if (!rootRef.current?.contains(event.target)) setPinned(false);
    }
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [pinned]);

  // Below the item, or above it when there is no room; kept inside the window,
  // and moved again if the box grows (the spell's rules arrive a moment later)
  // or something scrolls.
  useLayoutEffect(() => {
    if (!open) return undefined;
    function position() {
      if (!triggerRef.current || !boxRef.current) return;
      const at = triggerRef.current.getBoundingClientRect();
      const box = boxRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(at.left, window.innerWidth - box.width - 8));
      const below = at.bottom + 6;
      const top = below + box.height > window.innerHeight - 8 ? Math.max(8, at.top - box.height - 6) : below;
      setPlace((previous) => (previous && previous.left === left && previous.top === top ? previous : { left, top }));
    }
    position();
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    const watcher = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    watcher?.observe(boxRef.current);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      watcher?.disconnect();
    };
  }, [open]);

  function enter() {
    clearTimeout(leaveTimer.current);
    setHover(true);
  }

  // A short pause before closing, so the pointer can cross the gap into the box.
  function leave() {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHover(false), 180);
  }

  function closeAll() {
    clearTimeout(leaveTimer.current);
    setPinned(false);
    setHover(false);
    setFocus(false);
  }

  return (
    <span
      ref={rootRef}
      className="character-summary__peek-root"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={(event) => {
        // Escape puts the keyboard back on the item without opening the box again.
        if (skipFocus.current) {
          skipFocus.current = false;
          return;
        }
        setFocus(event.target.matches(":focus-visible") || Boolean(boxRef.current?.contains(event.target)));
      }}
      onBlur={() => {
        // Moving from the item into its box (or back) isn't leaving: look at
        // where the keyboard ended up once the move has finished.
        setTimeout(() => {
          if (!rootRef.current?.contains(document.activeElement)) setFocus(false);
        }, 0);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        const inside = boxRef.current?.contains(document.activeElement);
        closeAll();
        if (inside) {
          skipFocus.current = true;
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        type="button"
        ref={triggerRef}
        className={className}
        aria-expanded={pinned}
        aria-describedby={open ? boxId : undefined}
        onClick={() => setPinned((value) => !value)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={boxId}
          ref={boxRef}
          className="character-summary__peek"
          role={pinned ? "region" : "tooltip"}
          aria-label={pinned ? `${label} details` : undefined}
          style={place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: "hidden" }}
        >
          {children({ pinned })}
        </div>
      )}
    </span>
  );
}

// A short reading of a spell from the SRD, fetched the first time someone
// looks at it (so a table full of casters doesn't download every spell).
const briefCache = new Map();
async function loadSpellBrief(name) {
  const key = String(name).toLowerCase();
  if (briefCache.has(key)) return briefCache.get(key);
  const matches = findSrdMatches(name, await getSpells());
  let brief = null;
  if (matches.length > 0) {
    const spell = await getSpellDetails(matches[0].index);
    const text = (spell.desc ?? []).find((line) => typeof line === "string" && line.trim()) ?? "";
    brief = {
      facts: [
        `${(Number(spell.level) || 0) === 0 ? `${spell.school?.name ?? ""} cantrip` : `${ORDINALS[spell.level]}-level ${spell.school?.name ?? ""}`}`.trim(),
        spell.casting_time,
        spell.range,
        spell.concentration ? `Concentration, ${String(spell.duration ?? "").toLowerCase()}` : spell.duration,
      ].filter(Boolean),
      text: text.length > 280 ? `${text.slice(0, 277).trimEnd()}…` : text,
    };
  }
  briefCache.set(key, brief);
  return brief;
}

function SpellPeekBody({ spell, onFullText }) {
  const [brief, setBrief] = useState(undefined);
  const noteLines = noteLinesOf(spell);
  useEffect(() => {
    let live = true;
    loadSpellBrief(itemName(spell))
      .then((value) => live && setBrief(value))
      .catch(() => live && setBrief(null));
    return () => {
      live = false;
    };
  }, [spell]);
  return (
    <>
      <p className="character-summary__peek-title">
        <b>{itemName(spell)}</b> · {(Number(spell.level) || 0) === 0 ? "Cantrip" : `${ORDINALS[Number(spell.level)]} level`}
      </p>
      <p className="character-summary__peek-label">Rules (SRD)</p>
      {brief?.facts?.length > 0 && <p className="character-summary__peek-facts">{brief.facts.join(" · ")}</p>}
      {brief?.text && <p className="character-summary__peek-text">{brief.text}</p>}
      {brief === undefined && <InlineLoading className="character-summary__peek-facts">Loading the rules…</InlineLoading>}
      {brief === null && <p className="character-summary__peek-facts">No SRD text for this spell.</p>}
      {spell.components && (
        <p className="character-summary__slots">
          Components: {Array.isArray(spell.components) ? spell.components.join(", ") : spell.components}
        </p>
      )}
      <p className="character-summary__peek-label">Player&apos;s note</p>
      {noteLines.length > 0 ? <NoteLines lines={noteLines} /> : <p className="character-summary__empty">No note from the player on this spell.</p>}
      <button type="button" className="character-summary__rules-button" onClick={onFullText}>
        Full spell text
      </button>
    </>
  );
}

function AttackPeekBody({ attack, live }) {
  const noteLines = noteLinesOf(attack);
  return (
    <>
      <p className="character-summary__peek-title">
        <b>{attack.name}</b>
      </p>
      <p className="character-summary__peek-facts">
        {formatModifier(live.toHit)} to hit
        {describeDamageParts(live.damageParts) ? ` · ${describeDamageParts(live.damageParts)}` : ""}
        {live.optionalParts.map((part) => ` (+${part.dice} ${part.type} ${part.condition})`).join("")}
      </p>
      <p className="character-summary__peek-label">Weapon details and the player&apos;s notes</p>
      {noteLines.length > 0 ? <NoteLines lines={noteLines} /> : <p className="character-summary__empty">No notes on this attack.</p>}
    </>
  );
}

// Known spells grouped by level; each is a button that opens its Peek.
function SpellsByLevel({ spellcasting, prepares = false, openRules }) {
  const spells = [...(spellcasting?.cantripsKnown ?? []), ...(spellcasting?.spellsKnown ?? [])];
  if (spells.length === 0) return null;
  const levels = [...new Set(spells.map((spell) => Number(spell?.level) || 0))].sort((a, b) => a - b);
  const keyOf = (spell) => `${Number(spell?.level) || 0}:${spell?.index ?? itemName(spell)}`;

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
                    <Peek
                      key={keyOf(spell)}
                      label={itemName(spell)}
                      className={`character-summary__spell${resting ? " character-summary__spell--resting" : ""}`}
                      trigger={
                        <>
                          {itemName(spell)}
                          {resting ? " (not prepared)" : ""}
                        </>
                      }
                    >
                      {() => <SpellPeekBody spell={spell} onFullText={() => openRules(spell)} />}
                    </Peek>
                  );
                })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The weapon's picture, from the app's own icons: a quiver for a ranged
// weapon, a sword otherwise. It's decoration; the name beside it says it all.
function attackIcon(attack) {
  return getMagicItemIcon(/ranged/i.test(String(attack?.notes ?? "")) ? "ammunition" : "weapon");
}

// "Attacks and spells": every attack and spell, in a box that scrolls on its
// own. Hover, focus or click an attack or spell to read what it does and any
// note the player wrote on it.
function AttacksAndSpells({ sheet, bannedChoices }) {
  const detailView = useSrdDetailView();
  const [flagOpen, setFlagOpen] = useState(false);
  const flagId = useId();
  const spellcasting = sheet.spellcasting;
  const attacks = sheet.attacks ?? [];

  // The SRD's full text, fetched only when asked for.
  function openRules(spell) {
    detailView.open(itemName(spell), async () => {
      const matches = findSrdMatches(itemName(spell), await getSpells());
      if (matches.length === 0) throw new Error("Not an SRD spell");
      return Promise.all(matches.map((match) => getSpellDetails(match.index).then(formatSpellDetails)));
    });
  }

  return (
    <section className="character-summary__panel character-summary__attacks" aria-labelledby={`${flagId}-title`}>
      <header className="character-summary__panel-head">
        <h4 id={`${flagId}-title`} className="character-summary__panel-title">
          Attacks and spells
        </h4>
        {bannedChoices.length > 0 && (
          <button
            type="button"
            className="character-summary__flag-toggle"
            aria-expanded={flagOpen}
            aria-controls={flagId}
            onClick={() => setFlagOpen((value) => !value)}
          >
            <span aria-hidden="true">⚠</span> Table content: review flagged choices
          </button>
        )}
      </header>
      {bannedChoices.length > 0 && (
        <p id={flagId} className="character-summary__flag" role="note" hidden={!flagOpen}>
          ⚠ Uses options not allowed at this table: {bannedChoices.map((item) => `${item.name} (${item.label})`).join(", ")}
        </p>
      )}
      <div className="character-summary__panel-body">
        {attacks.length > 0 && (
          <ul className="character-summary__attack-list">
            {attacks.map((attack) => {
              const live = getEffectiveAttack(sheet, attack);
              return (
                <li key={attack.index ?? attack.id ?? attack.name}>
                  <Peek
                    label={attack.name}
                    className="character-summary__attack"
                    trigger={
                      <>
                        <img className="character-summary__attack-icon" src={attackIcon(attack)} alt="" width="30" height="30" />
                        <span className="character-summary__attack-name">
                          <b>
                            {attack.name}
                            {live.isMagicWeapon || live.isEnchanted ? " ✨" : ""}
                          </b>
                          {attack.notes && <span className="character-summary__attack-sub">{noteLinesOf(attack)[0]}</span>}
                        </span>
                        <span className="character-summary__attack-math">
                          <span className="character-summary__attack-label">To hit</span> <b>{formatModifier(live.toHit)}</b>
                        </span>
                        <span className="character-summary__attack-math">
                          <span className="character-summary__attack-label">Damage</span>{" "}
                          <b>
                            {describeDamageParts(live.damageParts)}
                            {live.optionalParts.map((part) => ` (+${part.dice} ${part.type} ${part.condition})`).join("")}
                          </b>
                        </span>
                      </>
                    }
                  >
                    {() => <AttackPeekBody attack={attack} live={live} />}
                  </Peek>
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
        <SpellsByLevel spellcasting={spellcasting} prepares={Boolean(getPreparedLimit(sheet))} openRules={openRules} />
        {attacks.length === 0 && !spellcasting && <p className="character-summary__empty">Nothing listed.</p>}
      </div>
      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </section>
  );
}

// A shield with the armor class inside it.
export function AcShield({ value }) {
  return (
    <span className="character-summary__shield" role="img" aria-label={`Armor class ${value}`}>
      <svg viewBox="0 0 44 50" aria-hidden="true" focusable="false">
        <path d="M22 2 L40 8 V24 C40 36 32 44 22 48 C12 44 4 36 4 24 V8 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <span className="character-summary__shield-text" aria-hidden="true">
        <span className="character-summary__shield-label">AC</span>
        <span className="character-summary__shield-value">{value}</span>
      </span>
    </span>
  );
}

// Skills three columns by six rows, with a line between the columns, then the
// saving throws underneath. A dot-and-bold marks skills and saves the
// character is proficient in.
function SkillsAndSaves({ sheet }) {
  const proficiency = getProficiencyBonus(sheet.level ?? 1);
  return (
    <section className="character-summary__panel" aria-label="Skills and saves">
      <header className="character-summary__panel-head">
        <h4 className="character-summary__panel-title">Skills and saves</h4>
      </header>
      <ul className="character-summary__skills">
        {SKILLS.map((skill) => {
          const proficient = Boolean(sheet.skills?.[skill.index]);
          const value = getSkillModifier(sheet.abilityScores?.[skill.ability] ?? 10, proficient, proficiency, {
            expertise: proficient && Boolean(sheet.skillExpertise?.[skill.index]),
            bonus: sheet.skillBonuses?.[skill.index] ?? 0,
          });
          return (
            <li key={skill.index} className={proficient ? "character-summary__skill character-summary__skill--proficient" : "character-summary__skill"}>
              <span>
                {skill.name}
                {proficient && <span className="character-summary__visually-hidden"> (proficient)</span>}
              </span>
              <b>{formatModifier(value)}</b>
            </li>
          );
        })}
      </ul>
      <ul className="character-summary__saves" aria-label="Saving throws">
        {ABILITY_SCORES.map((ability) => {
          const proficient = Boolean(sheet.savingThrows?.[ability]);
          return (
            <li key={ability} className={proficient ? "character-summary__skill--proficient" : undefined}>
              {ABILITY_ABBREVIATIONS[ability]}{" "}
              <b>{formatModifier(getSaveModifier(sheet.abilityScores?.[ability] ?? 10, proficient, proficiency))}</b>
              {proficient && <span className="character-summary__visually-hidden"> (proficient)</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const PASSIVE_LABELS = { perception: "Perception", insight: "Insight", investigation: "Investigation" };

// A READ-ONLY summary of a player's character for the DM. There is nothing
// editable here on purpose; DMs can see everything but never change a sheet.
// bannedChoices: what this character uses that the DM's table doesn't allow
// (see utils/contentRules.js), flagged in the Attacks and spells header.
function CharacterSummaryCard({ sheet, playerName, bannedChoices = [] }) {
  const hitPoints = sheet.combat?.hitPoints ?? { current: 0, max: 0, temporary: 0 };
  const hpPercent = hitPoints.max > 0 ? Math.min(100, Math.round((Math.max(0, hitPoints.current) / hitPoints.max) * 100)) : 0;
  const armorClass = getEffectiveArmorClass(sheet);
  const companions = getCompanions(sheet);
  const senses = getSenses(sheet);
  const languages = (sheet.languages ?? "").trim();
  const dying = hitPoints.max > 0 && hitPoints.current <= 0;

  return (
    <article className="character-summary">
      <header className="character-summary__header">
        {/* The character's portrait, or their picture drawn from their race, class and background. */}
        <span className="character-summary__portrait" aria-hidden="true">
          <CharacterAvatar character={sheet} />
        </span>
        <div className="character-summary__who">
          <h3 className="character-summary__name">{sheet.name}</h3>
          <p className="character-summary__meta">
            Level {sheet.level} · {sheet.race?.name ?? "No race"} · {sheet.class?.name ?? "No class"}
            {sheet.background?.name ? ` · ${sheet.background.name}` : ""}
          </p>
          {playerName && <p className="character-summary__player">Player: {playerName}</p>}
          {/* Conditions the player has marked, and the spell they're concentrating on. */}
          <div className="character-summary__status">
            <ConditionBadges conditions={sheet.conditions ?? []} readOnly />
            {sheet.concentration?.spell && (
              <span className="character-summary__chip">
                Concentrating: {sheet.concentration.spell}
                {typeof sheet.concentration.rounds === "number" ? ` (${sheet.concentration.rounds} rounds left)` : ""}
              </span>
            )}
            {sheet.inspiration > 0 && <span className="character-summary__chip character-summary__chip--plain">Inspiration</span>}
          </div>
        </div>
        <div className="character-summary__vitals">
          <div className="character-summary__vital character-summary__vital--hp">
            <span className="character-summary__stat-label">HP</span>
            <span className="character-summary__stat-value">
              {hitPoints.current}/{hitPoints.max}
              {hitPoints.temporary > 0 && <span className="character-summary__temp"> +{hitPoints.temporary} temp</span>}
            </span>
            <span
              className={`character-summary__bar${hpPercent <= 50 ? " character-summary__bar--low" : ""}`}
              role="img"
              aria-label={`${hpPercent} percent of hit points`}
            >
              <span style={{ width: `${hpPercent}%` }} />
            </span>
            {dying && (
              <span className="character-summary__slots">
                Death saves: {sheet.deathSaves?.successes ?? 0} ✓ · {sheet.deathSaves?.failures ?? 0} ✗
              </span>
            )}
          </div>
          <div className="character-summary__vital character-summary__vital--ac">
            <AcShield value={armorClass} />
          </div>
          <div className="character-summary__vital">
            <span className="character-summary__stat-label">Speed</span>
            <span className="character-summary__stat-value">{sheet.combat?.speed ?? 30} ft</span>
          </div>
          <div className="character-summary__vital">
            <span className="character-summary__stat-label">Initiative</span>
            <span className="character-summary__stat-value">{formatModifier(sheet.combat?.initiative ?? 0)}</span>
          </div>
        </div>
      </header>

      <ul className="character-summary__abilities">
        {ABILITY_SCORES.map((ability) => {
          const score = sheet.abilityScores?.[ability] ?? 10;
          return (
            <li className="character-summary__ability" key={ability}>
              <span className="character-summary__ability-name">{ABILITY_ABBREVIATIONS[ability]}</span>
              <span className="character-summary__ability-score">{score}</span>
              <span className="character-summary__ability-mod">{formatModifier(getAbilityModifier(score))}</span>
            </li>
          );
        })}
      </ul>

      <div className="character-summary__middle">
        <SkillsAndSaves sheet={sheet} />
        <section className="character-summary__panel" aria-label="Passive scores, languages and senses">
          <header className="character-summary__panel-head">
            <h4 className="character-summary__panel-title">Passive scores</h4>
          </header>
          <ul className="character-summary__passives">
            {Object.keys(PASSIVE_LABELS).map((skill) => (
              <li key={skill}>
                {PASSIVE_LABELS[skill]} <b>{getPassiveScore(sheet, skill)}</b>
              </li>
            ))}
          </ul>
          <header className="character-summary__panel-head character-summary__panel-head--sub">
            <h4 className="character-summary__panel-title">Languages and senses</h4>
          </header>
          <p className="character-summary__lang">{languages || "No languages listed"}</p>
          {senses.length > 0 && <p className="character-summary__lang">{senses.join(", ")}</p>}
        </section>
      </div>

      <AttacksAndSpells sheet={sheet} bannedChoices={bannedChoices} />

      <div className="character-summary__folds">
        {/* Their companions (a mount, a familiar, a summon): HP and AC. */}
        <details className="character-summary__section">
          <summary>Companions</summary>
          {companions.length === 0 ? (
            <p className="character-summary__empty">No companions.</p>
          ) : (
            <ul className="character-summary__list">
              {companions.map((creature) => {
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
          )}
        </details>

        <details className="character-summary__section">
          <summary>Inventory</summary>
          <p className="character-summary__slots">Attuned items: {getAttunedCount(sheet.equipment)}/3</p>
          <NameList title="Equipment" items={sheet.equipment} />
          {(sheet.equipment ?? []).length === 0 && <p className="character-summary__empty">Nothing listed.</p>}
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
          {sheet.appearance && <p className="character-summary__text">{sheet.appearance}</p>}
          {sheet.notes && <p className="character-summary__text">{sheet.notes}</p>}
        </details>
      </div>
    </article>
  );
}

export default CharacterSummaryCard;

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCharacter } from "../../utils/characterStore";
import {
  ABILITY_ABBREVIATIONS,
  ABILITY_SCORES,
  SKILLS,
  formatModifier,
  getAbilityModifier,
  getEffectiveArmorClass,
  getPreparedLimit,
  getProficiencyBonus,
  getSaveModifier,
  getSkillModifier,
  getSpellNumbers,
  getSpellSlots,
  isSpellPrepared,
  ordinalLevel,
} from "../../utils/characterSheet";
import { describeDamageParts, getEffectiveAttack } from "../../utils/combatEffects";
import "./CharacterPrintPage.css";

const itemName = (item) => (typeof item === "string" ? item : (item?.name ?? "Unnamed"));

// One short list of "label: value" boxes.
function Stat({ label, children }) {
  return (
    <div className="print-sheet__stat">
      <span className="print-sheet__stat-label">{label}</span>
      <span className="print-sheet__stat-value">{children}</span>
    </div>
  );
}

// The page itself: everything that gets printed, from one character.
export function PrintableSheet({ sheet, withSpells = true, withFeatureText = false, withNotes = false }) {
  const level = Number(sheet.level) || 1;
  const proficiency = getProficiencyBonus(level);
  const scores = sheet.abilityScores ?? {};
  const hp = sheet.combat?.hitPoints ?? { max: 0 };
  const hitDice = sheet.combat?.hitDice;
  const skillModifier = (skill) =>
    getSkillModifier(scores[skill.ability] ?? 10, Boolean(sheet.skills?.[skill.index]), proficiency, {
      expertise: Boolean(sheet.skills?.[skill.index] && sheet.skillExpertise?.[skill.index]),
      bonus: sheet.skillBonuses?.[skill.index] ?? 0,
    });
  const perception = SKILLS.find((skill) => skill.index === "perception");
  const spellNumbers = getSpellNumbers(sheet);
  const slots = getSpellSlots(sheet.spellcasting).filter((slot) => slot.max > 0);
  const spells = [...(sheet.spellcasting?.cantripsKnown ?? []), ...(sheet.spellcasting?.spellsKnown ?? [])];
  const spellLevels = [...new Set(spells.map((spell) => Number(spell.level) || 0))].sort((a, b) => a - b);
  const preparedLimit = getPreparedLimit(sheet);
  const attacks = sheet.attacks ?? [];
  const features = [...(sheet.features ?? []), ...(sheet.feats ?? [])];
  const equipment = sheet.equipment ?? [];
  const resources = sheet.resources ?? [];

  return (
  <article className="print-sheet" aria-label={`${sheet.name} character sheet`}>
    <header className="print-sheet__header">
      <h1 className="print-sheet__name">{sheet.name}</h1>
      <p className="print-sheet__meta">
        Level {level} {sheet.race?.name ?? ""} {sheet.class?.name ?? ""}
        {sheet.class?.subclass?.name ? ` (${sheet.class.subclass.name})` : ""}
        {sheet.background?.name ? ` · ${sheet.background.name}` : ""}
      </p>
    </header>

    <section className="print-sheet__stats" aria-label="At a glance">
      <Stat label="Armor Class">{getEffectiveArmorClass(sheet)}</Stat>
      <Stat label="Hit Points">{hp.max}</Stat>
      <Stat label="Speed">{sheet.combat?.speed ?? 30} ft</Stat>
      <Stat label="Initiative">{formatModifier(sheet.combat?.initiative ?? 0)}</Stat>
      <Stat label="Proficiency">{formatModifier(proficiency)}</Stat>
      {perception && <Stat label="Passive Perception">{10 + skillModifier(perception)}</Stat>}
      {hitDice?.die && <Stat label="Hit Dice">{hitDice.total}d{String(hitDice.die).replace(/^d/i, "")}</Stat>}
      {spellNumbers && <Stat label="Spell save DC">{spellNumbers.saveDc}</Stat>}
      {spellNumbers && <Stat label="Spell attack">{formatModifier(spellNumbers.spellAttack)}</Stat>}
    </section>

    <section className="print-sheet__abilities" aria-label="Ability scores">
      {ABILITY_SCORES.map((ability) => {
        const score = scores[ability] ?? 10;
        const isProficient = Boolean(sheet.savingThrows?.[ability]);
        return (
          <div className="print-sheet__ability" key={ability}>
            <span className="print-sheet__ability-name">{ABILITY_ABBREVIATIONS[ability]}</span>
            <span className="print-sheet__ability-mod">{formatModifier(getAbilityModifier(score))}</span>
            <span className="print-sheet__ability-score">{score}</span>
            <span className="print-sheet__ability-save">
              {isProficient ? "● " : "○ "}Save {formatModifier(getSaveModifier(score, isProficient, proficiency, sheet.saveBonus ?? 0))}
            </span>
          </div>
        );
      })}
    </section>

    <div className="print-sheet__columns">
      <section className="print-sheet__block print-sheet__skills" aria-labelledby="print-skills">
        <h2 id="print-skills" className="print-sheet__heading">Skills</h2>
        <ul className="print-sheet__plain-list">
          {SKILLS.map((skill) => {
            const isProficient = Boolean(sheet.skills?.[skill.index]);
            const hasExpertise = isProficient && Boolean(sheet.skillExpertise?.[skill.index]);
            return (
              <li key={skill.index}>
                <span className="print-sheet__mark">{hasExpertise ? "◉" : isProficient ? "●" : "○"}</span>
                <span className="print-sheet__skill-mod">{formatModifier(skillModifier(skill))}</span>
                <span>
                  {skill.name} <small>({ABILITY_ABBREVIATIONS[skill.ability]})</small>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="print-sheet__fine">○ not proficient · ● proficient · ◉ expertise</p>
      </section>

      <div className="print-sheet__side">
        {attacks.length > 0 && (
          <section className="print-sheet__block" aria-labelledby="print-attacks">
            <h2 id="print-attacks" className="print-sheet__heading">Attacks</h2>
            <table className="print-sheet__table">
              <thead>
                <tr>
                  <th scope="col">Attack</th>
                  <th scope="col">To hit</th>
                  <th scope="col">Damage</th>
                </tr>
              </thead>
              <tbody>
                {attacks.map((attack) => {
                  const live = getEffectiveAttack(sheet, attack);
                  return (
                    <tr key={attack.id ?? attack.index ?? attack.name}>
                      <td>{attack.name}</td>
                      <td>{formatModifier(live.toHit)}</td>
                      <td>{describeDamageParts(live.damageParts) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {resources.length > 0 && (
          <section className="print-sheet__block" aria-labelledby="print-resources">
            <h2 id="print-resources" className="print-sheet__heading">Resources</h2>
            <ul className="print-sheet__plain-list">
              {resources.map((resource) => (
                <li key={resource.id ?? resource.name}>
                  <span>{resource.name}</span> <strong>{resource.max}</strong>
                  <small> per {resource.resetOn === "short" ? "short rest" : resource.resetOn === "dawn" ? "dawn" : resource.resetOn === "manual" ? "refill" : "long rest"}</small>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="print-sheet__block" aria-labelledby="print-gear">
          <h2 id="print-gear" className="print-sheet__heading">Equipment</h2>
          {equipment.length === 0 ? (
            <p className="print-sheet__fine">Nothing listed.</p>
          ) : (
            <ul className="print-sheet__plain-list">
              {equipment.map((item, index) => (
                <li key={item?.id ?? `${itemName(item)}-${index}`}>
                  {itemName(item)}
                  {item?.quantity > 1 ? ` ×${item.quantity}` : ""}
                  {item?.equipped ? " (worn)" : ""}
                  {item?.attuned ? " (attuned)" : ""}
                </li>
              ))}
            </ul>
          )}
          <p className="print-sheet__fine">Gold: {sheet.gold ?? 0}</p>
        </section>
      </div>
    </div>

    {withSpells && spells.length > 0 && (
      <section className="print-sheet__block" aria-labelledby="print-spells">
        <h2 id="print-spells" className="print-sheet__heading">Spells</h2>
        {slots.length > 0 && (
          <p className="print-sheet__slots">
            Spell slots:{" "}
            {slots.map((slot) => `${ordinalLevel(slot.level)} ${"□".repeat(Math.min(slot.max, 9))}`).join("   ")}
          </p>
        )}
        {preparedLimit && (
          <p className="print-sheet__fine">
            Prepared spells: up to {preparedLimit.limit}. ✓ marks the ones prepared.
          </p>
        )}
        <ul className="print-sheet__plain-list">
          {spellLevels.map((spellLevel) => (
            <li key={spellLevel}>
              <strong>{spellLevel === 0 ? "Cantrips" : ordinalLevel(spellLevel)}:</strong>{" "}
              {spells
                .filter((spell) => (Number(spell.level) || 0) === spellLevel)
                .map((spell) =>
                  preparedLimit && spellLevel > 0 && isSpellPrepared(spell) && !spell.bonusSpell && !spell.grantedBy
                    ? `${spell.name} ✓`
                    : spell.name,
                )
                .join(", ")}
            </li>
          ))}
        </ul>
      </section>
    )}

    {features.length > 0 && (
      <section className="print-sheet__block" aria-labelledby="print-features">
        <h2 id="print-features" className="print-sheet__heading">Features and feats</h2>
        {withFeatureText ? (
          <dl className="print-sheet__definitions">
            {features.map((feature, index) => (
              <div key={feature?.id ?? `${itemName(feature)}-${index}`}>
                <dt>{itemName(feature)}</dt>
                {feature?.description && <dd>{feature.description}</dd>}
              </div>
            ))}
          </dl>
        ) : (
          <p className="print-sheet__inline-list">{features.map(itemName).join(" · ")}</p>
        )}
      </section>
    )}

    {withNotes && (sheet.backstory || sheet.appearance || sheet.notes) && (
      <section className="print-sheet__block" aria-labelledby="print-notes">
        <h2 id="print-notes" className="print-sheet__heading">Backstory and notes</h2>
        {sheet.backstory && <p className="print-sheet__prose">{sheet.backstory}</p>}
        {sheet.appearance && <p className="print-sheet__prose">{sheet.appearance}</p>}
        {sheet.notes && <p className="print-sheet__prose">{sheet.notes}</p>}
      </section>
    )}

    <footer className="print-sheet__footer">
      Made with QuestKeeper · {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
    </footer>
  </article>
  );
}

// A paper version of a character: what you'd want on the table beside the
// dice. "Print or save as PDF" opens the browser's own print window, where
// "Save as PDF" is a choice; the page around the sheet is hidden then, so
// only the sheet itself comes out (see CharacterPrintPage.css).
function CharacterPrintPage() {
  const { id } = useParams();
  const [sheet, setSheet] = useState(null);
  const [status, setStatus] = useState("loading");
  const [withSpells, setWithSpells] = useState(true);
  const [withFeatureText, setWithFeatureText] = useState(false);
  const [withNotes, setWithNotes] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    getCharacter(id)
      .then((loaded) => {
        if (isCancelled) return;
        setSheet(loaded);
        setStatus(loaded ? "ready" : "missing");
      })
      .catch(() => !isCancelled && setStatus("failed"));
    return () => {
      isCancelled = true;
    };
  }, [id]);

  // While this page is open, the rest of the site's page furniture (menu,
  // footer, banners) is hidden when printing.
  useEffect(() => {
    document.body.classList.add("printing-sheet");
    return () => document.body.classList.remove("printing-sheet");
  }, []);

  // "Save as PDF" names the file after the page's title, so while printing the
  // title is the character's name.
  useEffect(() => {
    if (!sheet) return undefined;
    const previous = { title: document.title };
    const before = () => {
      previous.title = document.title;
      document.title = `${sheet.name || "Character"} - QuestKeeper`;
    };
    const after = () => {
      document.title = previous.title;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, [sheet]);

  if (status === "loading") {
    return (
      <main className="print-page" role="status">
        <p>Getting the sheet ready…</p>
      </main>
    );
  }
  if (status !== "ready") {
    return (
      <main className="print-page">
        <p className="print-page__message">
          {status === "missing" ? "That character couldn't be found." : "The sheet couldn't be loaded. Try again."}
        </p>
        <Link to="/characters">Back to your characters</Link>
      </main>
    );
  }

  return (
    <main className="print-page">
      <div className="print-toolbar">
        <Link className="print-toolbar__back" to={`/characters/${sheet.id}`}>
          ← Back to the sheet
        </Link>
        <fieldset className="print-toolbar__choices">
          <legend>Include</legend>
          <label>
            <input type="checkbox" checked={withSpells} onChange={(event) => setWithSpells(event.target.checked)} />
            Spells
          </label>
          <label>
            <input type="checkbox" checked={withFeatureText} onChange={(event) => setWithFeatureText(event.target.checked)} />
            What each feature says
          </label>
          <label>
            <input type="checkbox" checked={withNotes} onChange={(event) => setWithNotes(event.target.checked)} />
            Backstory and notes
          </label>
        </fieldset>
        <button type="button" className="print-toolbar__button" onClick={() => window.print()}>
          Print or save as PDF
        </button>
        <p className="print-toolbar__hint">In the print window, choose &ldquo;Save as PDF&rdquo; as the printer.</p>
      </div>

      <PrintableSheet sheet={sheet} withSpells={withSpells} withFeatureText={withFeatureText} withNotes={withNotes} />
    </main>
  );
}

export default CharacterPrintPage;

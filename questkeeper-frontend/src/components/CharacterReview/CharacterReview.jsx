import {
  ABILITY_SCORES,
  ABILITY_LABELS,
  ABILITY_ABBREVIATIONS,
  getAbilityModifier,
  formatModifier,
} from "../../utils/characterSheet";
import Button from "../Button/Button";
import "./CharacterReview.css";

// The last step: a readable summary of the character, grouped into cards, with
// a Change button on each so a mistake can be fixed without clicking back
// through every step. Anything still missing is listed at the top.
function CharacterReview({
  name,
  race,
  characterClass,
  subclass,
  background,
  abilityScores,
  skills,
  cantrips,
  spells,
  equipment,
  canChangeGear = false,
  hitPoints,
  issues,
  onEdit,
  onBack,
  onCreate,
  isCreating,
}) {
  const className = [
    characterClass?.name,
    subclass ? `(${subclass.name})` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const hasMagic = cantrips.length > 0 || spells.length > 0;

  return (
    <div className="character-review">
      <header className="character-review__hero">
        <p className="character-review__eyebrow">Ready to meet them?</p>
        <h1 className="character-review__name">{name || "Your hero"}</h1>
        <p className="character-review__tagline">
          Level 1 {[race?.name, className].filter(Boolean).join(" ")}
          {background ? ` · ${background.name}` : ""}
        </p>
        <ul className="character-review__stats" aria-label="Starting numbers">
          {characterClass?.hitDie && (
            <li>
              <strong>d{characterClass.hitDie}</strong> hit die
            </li>
          )}
          {hitPoints !== null && (
            <li>
              <strong>{hitPoints}</strong> hit points
            </li>
          )}
          {race?.speed && (
            <li>
              <strong>{race.speed} ft</strong> speed
            </li>
          )}
        </ul>
      </header>

      {issues.length > 0 && (
        <section className="character-review__issues" role="alert">
          <h2 className="character-review__issues-title">
            A few things still need your attention
          </h2>
          <ul>
            {issues.map((issue) => (
              <li key={issue.step}>
                <span>{issue.message}</span>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => onEdit(issue.step)}
                >
                  Fix this
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="character-review__grid">
        <section className="character-review__card">
          <div className="character-review__card-head">
            <h2>Who they are</h2>
          </div>
          <dl className="character-review__facts">
            {[
              ["Name", name, "name"],
              ["Race", race?.name, "race"],
              ["Class", className, "class"],
              ["Background", background?.name, "background"],
            ].map(([label, value, step]) => (
              <div className="character-review__fact" key={label}>
                <dt>{label}</dt>
                <dd>{value || "Not chosen yet"}</dd>
                <Button
                  variant="secondary"
                  type="button"
                  aria-label={`Change ${label.toLowerCase()}`}
                  onClick={() => onEdit(step)}
                >
                  Change
                </Button>
              </div>
            ))}
          </dl>
        </section>

        <section className="character-review__card">
          <div className="character-review__card-head">
            <h2>Ability scores</h2>
            <Button
              variant="secondary"
              type="button"
              aria-label="Change ability scores"
              onClick={() => onEdit("abilities")}
            >
              Change
            </Button>
          </div>
          <ul className="character-review__abilities">
            {ABILITY_SCORES.map((ability) => {
              const score = abilityScores?.[ability];
              return (
                <li key={ability} title={ABILITY_LABELS[ability]}>
                  <span className="character-review__ability-name">
                    {ABILITY_ABBREVIATIONS[ability]}
                  </span>
                  <span className="character-review__ability-score">
                    {score ?? "—"}
                  </span>
                  <span className="character-review__ability-mod">
                    {score === undefined
                      ? ""
                      : formatModifier(getAbilityModifier(score))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="character-review__card">
          <div className="character-review__card-head">
            <h2>Skills</h2>
            <Button
              variant="secondary"
              type="button"
              aria-label="Change skills"
              onClick={() => onEdit("classSkills")}
            >
              Change
            </Button>
          </div>
          {skills.length > 0 ? (
            <ul className="character-review__chips">
              {skills.map((skill) => (
                <li key={skill.index}>
                  {skill.name}
                  <span className="character-review__chip-note">
                    {skill.from}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="character-review__empty">No skills chosen yet.</p>
          )}
        </section>

        {hasMagic && (
          <section className="character-review__card">
            <div className="character-review__card-head">
              <h2>Magic</h2>
              <Button
                variant="secondary"
                type="button"
                aria-label="Change spells"
                onClick={() => onEdit("classSpells")}
              >
                Change
              </Button>
            </div>
            {cantrips.length > 0 && (
              <>
                <h3 className="character-review__subhead">Cantrips</h3>
                <ul className="character-review__chips">
                  {cantrips.map((spell) => (
                    <li key={spell.index}>
                      {spell.name}
                      {spell.from && (
                        <span className="character-review__chip-note">
                          {spell.from}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {spells.length > 0 && (
              <>
                <h3 className="character-review__subhead">Level 1 spells</h3>
                <ul className="character-review__chips">
                  {spells.map((spell) => (
                    <li key={spell.index}>{spell.name}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        <section className="character-review__card">
          <div className="character-review__card-head">
            <h2>Starting gear</h2>
            {canChangeGear && (
              <Button
                variant="secondary"
                type="button"
                aria-label="Change starting gear"
                onClick={() => onEdit("equipment")}
              >
                Change
              </Button>
            )}
          </div>
          {equipment.length > 0 ? (
            <ul className="character-review__chips">
              {equipment.map((item) => (
                <li key={`${item.index}-${item.name}`}>
                  {item.name}
                  {item.quantity > 1 && (
                    <span className="character-review__chip-note">
                      x{item.quantity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="character-review__empty">
              Nothing yet. You can add gear on your sheet.
            </p>
          )}
        </section>
      </div>

      <div className="character-review__actions">
        <Button variant="secondary" type="button" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={onCreate}
          disabled={isCreating || issues.length > 0}
        >
          {isCreating ? "Creating..." : "Create character"}
        </Button>
      </div>
    </div>
  );
}

export default CharacterReview;

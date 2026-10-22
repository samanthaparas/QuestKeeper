import RuleTerm from "../RulesText/RuleTerm";
import { conditionWord } from "../../utils/conditions";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import "./PartyStrip.css";

const HEALTH_LABELS = { bloodied: "Bloodied", down: "Down" };
const PASSIVE_LABELS = { perception: "Perception", insight: "Insight", investigation: "Investigation" };
// Shorter forms for a tight card; screen readers still get the full words.
const PASSIVE_SHORT = { perception: "Perc", insight: "Ins", investigation: "Inv" };

// The whole party at a glance: one row per character with an HP bar, AC and
// conditions, plus passive scores for the DM. Read-only.
//
// rows: from toPartyRow(). onSelect(id): optional; makes each name a button
// (the DM uses it to open that character's full card below).
// "2 successes, 1 failure", read out for screen readers.
function deathSaveSummary({ successes, failures }) {
  return `Death saves: ${successes} ${successes === 1 ? "success" : "successes"}, ${failures} ${
    failures === 1 ? "failure" : "failures"
  }`;
}

function deathSaveWord({ successes, failures }) {
  if (failures >= 3) return "Dead";
  if (successes >= 3) return "Stable";
  return "";
}

// compact: a tighter card for the DM's Combat tab (short passive-score names).
// hideStatusFor: ids of characters whose conditions and concentration are
// shown somewhere else (on their initiative line), so the card doesn't repeat
// them. Anyone not listed keeps theirs on the card. The data is the same
// either way: this only decides where it's drawn.
// A name that won't fit beside the picture and the AC badge on one line: its
// card gives the name the full width (see PartyStrip.css) instead of cutting it.
function isLongName(name) {
  const words = String(name ?? "").split(/[\s-]+/);
  return String(name ?? "").length > 15 || words.some((word) => word.length > 11);
}

function PartyStrip({ rows, onSelect, selectedId, compact = false, hideStatusFor = null, currentId = null }) {
  if (rows.length === 0) return null;

  return (
    <ul className="party-strip" aria-label="Party">
      {rows.map((row) => (
        <li
          key={row.id}
          className={`party-strip__row party-strip__row--${row.health}${
            row.id === selectedId ? " party-strip__row--selected" : ""
          }${currentId && row.id === currentId ? " party-strip__row--turn" : ""}${
            compact && isLongName(row.name) ? " party-strip__row--long-name" : ""
          }`}
        >
          {/* The name sits right next to it, so the picture itself is decoration. */}
          <span className="party-strip__portrait" aria-hidden="true">
            <CharacterAvatar character={row} />
          </span>

          <div className="party-strip__who">
            {onSelect ? (
              <button
                type="button"
                className="party-strip__name party-strip__name--button"
                aria-pressed={row.id === selectedId}
                onClick={() => onSelect(row.id)}
              >
                {row.name}
              </button>
            ) : (
              <span className="party-strip__name">{row.name}</span>
            )}
            {row.summary && <span className="party-strip__summary">{row.summary}</span>}
            {currentId && row.id === currentId && (
              <span className="party-strip__turn-mark" role="img" aria-label="Their turn">
                ♛
              </span>
            )}
          </div>

          <div className="party-strip__hp">
            <span className="party-strip__hp-text">
              <span className="party-strip__label">HP</span> {row.hp.current}/{row.hp.max}
              {row.hp.temporary > 0 && (
                <span className="party-strip__temp"> +{row.hp.temporary} temp</span>
              )}
              {HEALTH_LABELS[row.health] && (
                <strong className="party-strip__health"> · {HEALTH_LABELS[row.health]}</strong>
              )}
            </span>
            {/* The bar is decoration; the numbers above say the same thing. */}
            <span className="party-strip__bar" aria-hidden="true">
              <span className="party-strip__bar-fill" style={{ width: `${row.hpPercent}%` }} />
            </span>
          </div>

          <span className="party-strip__ac">
            {compact && (
              <svg className="party-strip__shield" viewBox="0 0 36 42" aria-hidden="true" focusable="false">
                <path
                  d="M18 2 L33 7 V20 C33 30 26 37 18 40 C10 37 3 30 3 20 V7 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <span className="party-strip__label">AC</span> {row.armorClass}
          </span>

          {/* Down: how their death saves are going ("✓✓ ✗"). */}
          {row.deathSaves && (
            <span className="party-strip__death-saves" aria-label={deathSaveSummary(row.deathSaves)}>
              <span className="party-strip__label">Death saves</span>
              <span className="party-strip__death-marks" aria-hidden="true">
                <span className="party-strip__death-success">
                  {"✓".repeat(row.deathSaves.successes) || "–"}
                </span>{" "}
                <span className="party-strip__death-failure">
                  {"✗".repeat(row.deathSaves.failures) || "–"}
                </span>
              </span>
              {deathSaveWord(row.deathSaves) && (
                <strong className="party-strip__death-word">{deathSaveWord(row.deathSaves)}</strong>
              )}
            </span>
          )}

          {row.concentration && !hideStatusFor?.has(row.id) && (
            <span className="party-strip__concentration" title="Concentrating on this spell">
              🎯 {row.concentration}
              {row.concentrationRounds !== null && (
                <span className="party-strip__condition-rounds">
                  {" "}· {row.concentrationRounds} {row.concentrationRounds === 1 ? "round" : "rounds"} left
                </span>
              )}
            </span>
          )}

          {/* Spells changing their attacks, so the DM knows where the
              extra damage comes from. */}
          {!hideStatusFor?.has(row.id) &&
            row.effects?.map((effect) => (
              <span className="party-strip__concentration" key={effect} title="Active spell effect">
                ✨ {effect}
              </span>
            ))}

          {row.passives.length > 0 && (
            <span
              className="party-strip__passives"
              title="Passive scores: 10 + the skill bonus. Compare them to a DC without asking anyone to roll."
            >
              <span className="party-strip__label">Passive</span>
              {row.passives.map(({ skill, score }) => (
                <span key={skill} className="party-strip__passive">
                  {compact ? (
                    <>
                      <span aria-hidden="true">
                        {PASSIVE_SHORT[skill]} {score}
                      </span>
                      <span className="party-strip__sr">
                        {PASSIVE_LABELS[skill]} {score}
                      </span>
                    </>
                  ) : (
                    <>
                      {PASSIVE_LABELS[skill]} {score}
                    </>
                  )}
                </span>
              ))}
            </span>
          )}

          {row.conditions.length > 0 && !hideStatusFor?.has(row.id) && (
            <ul className="party-strip__conditions" aria-label={`${row.name}'s conditions`}>
              {row.conditions.map((condition) => {
                const word = conditionWord(condition.key);
                if (!word) return null;
                return (
                  <li key={condition.key} className="party-strip__condition">
                    <RuleTerm word={word}>
                      {word.name}
                      {condition.key === "exhaustion" ? ` ${condition.level ?? 1}` : ""}
                    </RuleTerm>
                    {typeof condition.rounds === "number" && (
                      <span className="party-strip__condition-rounds">
                        {" "}· {condition.rounds} {condition.rounds === 1 ? "round" : "rounds"} left
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Their companions (a mount, a familiar, a summon), each on its own line below. */}
          {(row.companions ?? (row.companion ? [row.companion] : [])).map((companion, index) => (
            <div
              key={`${companion.name}-${index}`}
              className={`party-strip__companion party-strip__companion--${companion.health}`}
              aria-label={`${row.name}'s companion, ${companion.name}`}
            >
              <span className="party-strip__companion-portrait" aria-hidden="true">
                {companion.portraitUrl ? <img src={companion.portraitUrl} alt="" /> : "🐾"}
              </span>
              <span className="party-strip__companion-name">{companion.name}</span>
              <span className="party-strip__hp-text">
                <span className="party-strip__label">HP</span> {companion.hp.current}/{companion.hp.max}
                {HEALTH_LABELS[companion.health] && (
                  <strong className="party-strip__health"> · {HEALTH_LABELS[companion.health]}</strong>
                )}
              </span>
              <span className="party-strip__bar party-strip__companion-bar" aria-hidden="true">
                <span className="party-strip__bar-fill" style={{ width: `${companion.hpPercent}%` }} />
              </span>
              <span className="party-strip__ac">
                <span className="party-strip__label">AC</span> {companion.armorClass}
              </span>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}

export default PartyStrip;

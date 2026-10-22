import { useState } from "react";
import CharacterAvatar from "../CharacterAvatar/CharacterAvatar";
import { getDmSupportIcon } from "../../utils/icons";
import { toStoryCard } from "../../utils/partyStrip";
import "./DmStoryTab.css";

const PASSIVE_LABELS = { perception: "Perception", insight: "Insight", investigation: "Investigation" };
const PASSIVE_SHORT = { perception: "Perc", insight: "Ins", investigation: "Inv" };

// The Story tab's "Party clues" panel: the numbers and hooks that matter
// between fights. Pick a character from the list to read their clues. Read-only
// on purpose: players manage their own sheets, so there is nothing to edit here.
//
// characters: the full sheets the DM can read.
// statusFor(id): optional; returns small status chips (conditions and
// concentration) to show on that character's line, so they stay visible here.
function DmStoryTab({ characters, statusFor = null }) {
  const [pickedId, setPickedId] = useState(null);
  // On narrow screens the panel folds to one line (wide screens always show it).
  const [open, setOpen] = useState(false);
  // The selected character's details stay open or closed as you pick someone else.
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (characters.length === 0) {
    return (
      <section className="dm-story table-page__section--panel" aria-label="Party clues">
        <header className="table-page__slim-head">
          <h2 className="table-page__slim-title">Party clues</h2>
        </header>
        <p className="dm-story__empty table-page__slim-body">Characters appear here when players join.</p>
      </section>
    );
  }

  const cards = characters.map((sheet) => ({ ...toStoryCard(sheet), portraitUrl: sheet.portraitUrl || "", race: sheet.race, class: sheet.class, background: sheet.background }));
  // Who would notice first: highest passive Perception.
  const sharpest = [...cards].sort((a, b) => b.passives[0].score - a.passives[0].score)[0];
  const selected = cards.find((card) => card.id === pickedId) ?? cards[0];
  const clueIcon = getDmSupportIcon("party-clues");
  const languagesIcon = getDmSupportIcon("languages");
  const sensesIcon = getDmSupportIcon("senses");

  return (
    <section className="dm-story table-page__section--panel" aria-labelledby="clues-title">
      <header className="table-page__slim-head table-page__slim-head--bar">
        <h2 id="clues-title" className="table-page__slim-title dm-story__title">
          {clueIcon && <img className="dm-story__title-icon" src={clueIcon} alt="" width="26" height="26" />}
          Party clues
        </h2>
        <button
          type="button"
          className="table-page__party-toggle dm-story__toggle"
          aria-expanded={open}
          aria-controls="clues-body"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="table-page__party-glance">
            {cards.length} {cards.length === 1 ? "character" : "characters"}
          </span>
          <span className="table-page__party-toggle-word">{open ? "Hide" : "Show"}</span>
        </button>
      </header>

      <div id="clues-body" className={`dm-story__body${open ? " dm-story__body--open" : ""}`}>
        <ul className="dm-story__picker" aria-label="Characters">
          {cards.map((card) => {
            const status = statusFor?.(card.id) ?? null;
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={`dm-story__pick${card.id === selected.id ? " dm-story__pick--active" : ""}`}
                  aria-pressed={card.id === selected.id}
                  onClick={() => setPickedId(card.id)}
                >
                  <span className="dm-story__avatar" aria-hidden="true">
                    <CharacterAvatar character={card} />
                  </span>
                  <span className="dm-story__pick-text">
                    <span className="dm-story__pick-name">{card.name}</span>
                    <span className="dm-story__pick-sub">{card.summary || "Adventurer"}</span>
                    <span className="dm-story__pick-passives">
                      {card.passives.map(({ skill, score }) => (
                        <span key={skill}>
                          <span aria-hidden="true">
                            {PASSIVE_SHORT[skill]} {score}
                          </span>
                          <span className="table-page__visually-hidden">
                            {PASSIVE_LABELS[skill]} {score}
                          </span>
                        </span>
                      ))}
                    </span>
                    {status}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <details
          className="dm-story__selected"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary className="dm-story__selected-summary">Character details · {selected.name}</summary>
          <div className="dm-story__selected-body">
            {selected.summary && <p className="dm-story__summary">{selected.summary}</p>}

            <dl className="dm-story__facts">
              <div>
                <dt>
                  {languagesIcon && <img src={languagesIcon} alt="" width="20" height="20" />}
                  Languages
                </dt>
                <dd>{selected.languages || "None listed"}</dd>
              </div>
              <div>
                <dt>
                  {sensesIcon && <img src={sensesIcon} alt="" width="20" height="20" />}
                  Senses
                </dt>
                <dd>{selected.senses.length ? selected.senses.join(", ") : "Normal sight"}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{selected.speed} ft</dd>
              </div>
            </dl>

            {selected.backstory && (
              <details className="dm-story__more">
                <summary>Backstory</summary>
                <p>{selected.backstory}</p>
              </details>
            )}
            {selected.appearance && (
              <details className="dm-story__more">
                <summary>Appearance</summary>
                <p>{selected.appearance}</p>
              </details>
            )}
          </div>
        </details>

        <details className="dm-story__tip">
          <summary>Using passive scores</summary>
          <p>
            Passive scores are 10 + the skill bonus. Compare them to a DC to decide quietly who notices
            something, without asking anyone to roll.
            {cards.length > 1 && (
              <>
                {" "}
                Sharpest eyes: <strong>{sharpest.name}</strong> (Perception {sharpest.passives[0].score}).
              </>
            )}
          </p>
        </details>
      </div>
    </section>
  );
}

export default DmStoryTab;

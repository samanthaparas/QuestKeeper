import { toStoryCard } from "../../utils/partyStrip";
import "./DmStoryTab.css";

const PASSIVE_LABELS = { perception: "Perception", insight: "Insight", investigation: "Investigation" };

// The DM screen's Story tab: the numbers and hooks that matter between
// fights, one card per character. Read-only, like the rest of the DM's view.
function DmStoryTab({ characters }) {
  if (characters.length === 0) {
    return (
      <p className="dm-story__empty">
        Characters appear here when players join.
      </p>
    );
  }

  const cards = characters.map(toStoryCard);
  // Who would notice first: highest passive Perception.
  const sharpest = [...cards].sort((a, b) => b.passives[0].score - a.passives[0].score)[0];

  return (
    <section className="dm-story" aria-label="Story">
      <p className="dm-story__tip">
        Passive scores are 10 + the skill bonus. Compare them to a DC to decide
        quietly who notices something, without asking anyone to roll.
        {cards.length > 1 && (
          <> Sharpest eyes: <strong>{sharpest.name}</strong> (Perception {sharpest.passives[0].score}).</>
        )}
      </p>

      <ul className="dm-story__cards">
        {cards.map((card) => (
          <li key={card.id} className="dm-story__card">
            <h3 className="dm-story__name">{card.name}</h3>
            {card.summary && <p className="dm-story__summary">{card.summary}</p>}

            <dl className="dm-story__facts">
              <div>
                <dt>Passive</dt>
                <dd>
                  {card.passives
                    .map(({ skill, score }) => `${PASSIVE_LABELS[skill]} ${score}`)
                    .join(" · ")}
                </dd>
              </div>
              <div>
                <dt>Languages</dt>
                <dd>{card.languages || "None listed"}</dd>
              </div>
              <div>
                <dt>Senses</dt>
                <dd>{card.senses.length ? card.senses.join(", ") : "Normal sight"}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{card.speed} ft</dd>
              </div>
            </dl>

            {card.backstory && (
              <details className="dm-story__more">
                <summary>Backstory</summary>
                <p>{card.backstory}</p>
              </details>
            )}
            {card.appearance && (
              <details className="dm-story__more">
                <summary>Appearance</summary>
                <p>{card.appearance}</p>
              </details>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default DmStoryTab;

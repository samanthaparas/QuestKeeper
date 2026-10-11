import { Link } from "react-router-dom";
import "./BookEntryPanel.css";

// What players see for an option from a published book QuestKeeper can't
// include: our own summary, which book it's from, a link to the full rules,
// and a way to rebuild it as homebrew.
//
// entry: { category, name, book, summary, linkUrl, variantOf, openVersion, inPicker }
// category: "background" or "race" (decides the homebrew form and the hint).
// inPicker: inside character creation the picker shows its own "Make it as
// homebrew" button (so progress isn't lost), so the page link is left out.
// What the player fills in after "Make it as homebrew", per category.
const HOMEBREW_HINTS = {
  background: "Add the skills, languages, gear and feature in your own words",
  race: "Add the speed, size, ability bonuses and traits in your own words",
};

function BookEntryPanel({ entry }) {
  const category = entry.category ?? "background";
  return (
    <div className="book-entry">
      <p className="book-entry__summary">{entry.summary}</p>

      <p className="book-entry__meta">
        From the <b>{entry.book}</b>
        {entry.variantOf && <>, a variant of the {entry.variantOf} {category}</>}.
      </p>

      {/* Why there are no rules here, in one plain sentence. */}
      <p className="book-entry__note">
        This book's text is copyrighted, so QuestKeeper shows a short summary
        and links to the full rules instead.
      </p>

      {entry.openVersion && <p className="book-entry__open">{entry.openVersion}</p>}

      <div className="book-entry__actions">
        <a
          className="book-entry__link"
          href={entry.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the full rules on Wikidot
        </a>
        {!entry.inPicker && (
          <Link
            className="book-entry__link"
            to="/homebrew"
            state={{
              newHomebrew: {
                category,
                name: entry.name,
                basedOn: entry.book,
                linkUrl: entry.linkUrl,
              },
            }}
          >
            Make it as homebrew
          </Link>
        )}
      </div>

      <p className="book-entry__hint">
        "Make it as homebrew" opens a form with the name and link filled in.{" "}
        {HOMEBREW_HINTS[category] ?? HOMEBREW_HINTS.background}, and it's ready to
        use in character creation.
      </p>
    </div>
  );
}

export default BookEntryPanel;

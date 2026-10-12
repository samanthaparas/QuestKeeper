import { Link } from "react-router-dom";
import "./BookEntryPanel.css";

// What players see for an option from a published book QuestKeeper can't
// include: our own summary, which book it's from, a link to the full rules,
// and (where homebrew supports it) a way to rebuild it as homebrew.
//
// entry: { category, name, book, summary, linkUrl, variantOf, openVersion,
//          classIndex, className, canMakeHomebrew, inPicker }
// category: "background", "race", "subclass" or "class".
// inPicker: inside character creation or level-up, the picker shows its own
// "Make it as homebrew" button (so progress isn't lost), so the page link here
// is left out.

// What the player fills in after "Make it as homebrew", per category.
const HOMEBREW_HINTS = {
  background: "Add the skills, languages, gear and feature in your own words",
  race: "Add the speed, size, ability bonuses and traits in your own words",
  subclass: "Add its features, with the level each one is gained, in your own words",
};

// Whether this entry can become homebrew: whole classes can't yet, and
// subclasses only when they belong to one of the 12 SRD classes.
function canMakeHomebrew(entry) {
  if (entry.category === "class") return false;
  if (entry.category === "subclass") return Boolean(entry.canMakeHomebrew);
  return true;
}

function BookEntryPanel({ entry }) {
  const category = entry.category ?? "background";
  const homebrewable = canMakeHomebrew(entry);

  return (
    <div className="book-entry">
      <p className="book-entry__summary">{entry.summary}</p>

      {/* "Book: X" reads right for every title ("the Tasha's..." doesn't). */}
      <p className="book-entry__meta">
        {category === "subclass" && entry.className && <>A {entry.className} subclass. </>}
        Book: <b>{entry.book}</b>.
        {entry.variantOf && <> A variant of the {entry.variantOf} {category}.</>}
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
        {homebrewable && !entry.inPicker && (
          <Link
            className="book-entry__link"
            to="/homebrew"
            state={{
              newHomebrew: {
                category,
                name: entry.name,
                basedOn: entry.book,
                linkUrl: entry.linkUrl,
                // A subclass is filed under its class in the homebrew form.
                ...(category === "subclass" ? { data: { parentClass: entry.classIndex } } : {}),
              },
            }}
          >
            Make it as homebrew
          </Link>
        )}
      </div>

      {homebrewable ? (
        <p className="book-entry__hint">
          "Make it as homebrew" opens a form with the name and link filled in.{" "}
          {HOMEBREW_HINTS[category] ?? HOMEBREW_HINTS.background}, and it's ready
          to use in your characters.
        </p>
      ) : (
        <p className="book-entry__hint">
          {category === "class"
            ? "Homebrew can't build whole classes yet, so this class can't be picked in character creation for now. Its subclasses are listed below."
            : "This subclass belongs to a class QuestKeeper doesn't have rules for yet, so it can't be made into homebrew for now."}
        </p>
      )}
    </div>
  );
}

export default BookEntryPanel;

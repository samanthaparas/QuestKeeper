import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CLASS_IDS, findGroupNotes } from "../../utils/homebrewMappers";
import { loadHomebrew } from "../../utils/homebrewCache";
import "./BookEntryPanel.css";

// What players see for an option from a published book QuestKeeper can't
// include: our own summary, which book it's from, a link to the full rules,
// and (where homebrew supports it) a way to rebuild it as homebrew.
//
// entry: { category, name, book, summary, linkUrl, variantOf, openVersion,
//          classIndex, className, canMakeHomebrew, inPicker }
// category: "background", "race", "subclass", "class" or "feat".
// inPicker: inside character creation or level-up, the picker shows its own
// "Make it as homebrew" button (so progress isn't lost), so the page link here
// is left out.

// What the player fills in after "Make it as homebrew", per category.
const HOMEBREW_HINTS = {
  background: "Add the skills, languages, gear and feature in your own words",
  race: "Add the speed, size, ability bonuses and traits in your own words",
  subclass: "Add its features, with the level each one is gained, in your own words",
  feat: "Write what it does, and any prerequisite, in your own words",
  class: "Add its hit die, proficiencies, spellcasting and features by level in your own words",
};

// Every book entry can be rebuilt as homebrew. canMakeHomebrew: false still
// turns it off for an entry that shouldn't offer it.
function BookEntryPanel({ entry }) {
  // The group's own-words notes on this entry, if someone made it into
  // homebrew and wrote or summarized the details. Only shown to people who can
  // already see that homebrew (the author, their tables and invited friends).
  const [notes, setNotes] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadHomebrew().then((entries) => {
      if (!cancelled) setNotes(findGroupNotes(entries, { ...entry, category: entry.category ?? "background" }));
    });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const category = entry.category ?? "background";
  const homebrewable = entry.canMakeHomebrew !== false;
  // A subclass of a book class (an Artificer one) belongs to the player's
  // homebrew version of that class, so that comes first.
  const needsHomebrewClass =
    category === "subclass" && entry.classIndex && !CLASS_IDS.includes(entry.classIndex);

  return (
    <div className="book-entry">
      <p className="book-entry__summary">{entry.summary}</p>

      {/* "Book: X" reads right for every title ("the Tasha's..." doesn't). */}
      <p className="book-entry__meta">
        {category === "subclass" && entry.className && <>A {entry.className} subclass. </>}
        Book: <b>{entry.book}</b>.
        {entry.variantOf && <> A variant of the {entry.variantOf} {category}.</>}
      </p>

      {notes && (
        <section className="book-entry__notes" aria-label="Your group's notes">
          <h3 className="book-entry__notes-title">Your group&apos;s notes</h3>
          {notes.summary && <p>{notes.summary}</p>}
          {notes.items.length > 0 && (
            <ul className="book-entry__notes-list">
              {notes.items.map((item) => (
                <li key={item.name}>
                  <b>{item.name}</b>
                  {item.level ? ` (level ${item.level})` : ""}. {item.text}
                </li>
              ))}
            </ul>
          )}
          <p className="book-entry__hint">
            Written in your group&apos;s own words and can miss details. Check
            the book for the exact rules.
          </p>
        </section>
      )}

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
                // A subclass is filed under its class in the homebrew form; a
                // class remembers which book class it rebuilds.
                ...(category === "subclass" && !needsHomebrewClass
                  ? { data: { parentClass: entry.classIndex } }
                  : {}),
                ...(category === "class" ? { data: { bookClass: entry.classIndex } } : {}),
              },
            }}
          >
            Make it as homebrew
          </Link>
        )}
      </div>

      {homebrewable && (
        <p className="book-entry__hint">
          "Make it as homebrew" opens a form with the name and link filled in.{" "}
          {HOMEBREW_HINTS[category] ?? HOMEBREW_HINTS.background} (or paste the
          rules for QuestKeeper to fill in the numbers), and it's ready to use
          in your characters.
          {needsHomebrewClass && entry.className && (
            <> Make your homebrew {entry.className} first, then choose it as this subclass&apos;s class.</>
          )}
        </p>
      )}
    </div>
  );
}

export default BookEntryPanel;

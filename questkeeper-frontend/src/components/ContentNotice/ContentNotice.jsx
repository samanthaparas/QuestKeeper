import { bannedChoicesOf, countBanned, groupBanned } from "../../utils/contentRules";
import "./ContentNotice.css";

// What the DM doesn't allow at this table, for players (see ContentRules): a
// quiet collapsed line listing it, and, when the player's own character uses
// something on the list, a short heads-up to talk to the DM. It's never
// shown when nothing is blocked.
//
// banned: the table's saved list. sheet: the player's own character, if known.
function ContentNotice({ banned = {}, sheet = null }) {
  if (countBanned(banned) === 0) return null;
  const uses = bannedChoicesOf(sheet, banned);

  return (
    <section className="content-notice" aria-label="What isn't allowed at this table">
      {uses.length > 0 && (
        <p className="content-notice__heads-up" role="note">
          <b>Heads up:</b> {sheet?.name ?? "Your character"} uses{" "}
          {uses.map((item) => `${item.name} (${item.label})`).join(", ")}, which your DM doesn&apos;t allow at this table.
          Have a word with your DM about it.
        </p>
      )}
      <details className="content-notice__details">
        <summary className="content-notice__summary">
          Not allowed at this table <span className="content-notice__count">{countBanned(banned)}</span>
        </summary>
        <ul className="content-notice__list">
          {groupBanned(banned).map((group) => (
            <li key={group.key}>
              <b>{group.label}:</b> {group.names.join(", ")}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export default ContentNotice;

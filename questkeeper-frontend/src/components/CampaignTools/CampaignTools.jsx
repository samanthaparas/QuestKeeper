import { useId, useState } from "react";
import { nameCampaign, splitCampaign, startCampaign } from "../../utils/journalStore";
import {
  campaignLabel,
  campaignNumbers,
  campaignOf,
  describeNotes,
  fromDateTimeInput,
  inWindow,
  suggestOlderNotes,
} from "../../utils/campaigns";
import { formatStamp } from "../../utils/journal";
import "./CampaignTools.css";

// The "Campaigns" panel on the Story tab, for anyone at the table. A table can
// run several campaigns one after another ("season 2"); each keeps its own
// session numbers (1.1 to 1.43, then 2.1, 2.2...).
//
// For a journal where two campaigns got mixed together it asks one question:
// "Are these your older campaign's notes?", guessed from how the notes were
// written (for instance, 15 notes typed in within an hour). Yes moves them into
// their own campaign; everything else stays as the current one. If the guess is
// wrong, "No, I'll choose" lets the person pick the dates. Names and numbering
// sit behind "More options". Nothing is deleted or rewritten: only which
// campaign a note belongs to changes, and any one note can be moved back.
//
// entries: the notes this person can see. campaignNumber / campaignNames: the
// table's current campaign and the names given so far. onChanged(): refresh.

// "15 notes by Ash Moonshade"
function whoWrote(group, limit = 3) {
  const writers = group.writers.slice(0, limit).map((writer) => writer.name);
  const more = group.writers.length > limit ? ` and ${group.writers.length - limit} more` : "";
  return writers.length ? ` by ${writers.join(", ")}${more}` : "";
}

const notesWord = (count) => `${count} ${count === 1 ? "note" : "notes"}`;

function when(group) {
  if (!group.first) return "";
  return group.last && group.last !== group.first
    ? `${formatStamp(group.first)} to ${formatStamp(group.last)}`
    : formatStamp(group.first);
}

function CampaignTools({ tableId, entries = [], campaignNumber = 1, campaignNames = {}, onChanged = () => {} }) {
  const baseId = useId();
  const numbers = campaignNumbers(entries, campaignNumber);
  const hasSeveral = numbers.length > 1;

  const here = entries.filter((entry) => campaignOf(entry) === campaignNumber);
  const suggestion = suggestOlderNotes(here);
  // "suggested": the one-question card. "manual": the person picks the dates.
  const [choosing, setChoosing] = useState(false);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [firstName, setFirstName] = useState(String(campaignNames[String(campaignNumber)] ?? ""));
  const [secondName, setSecondName] = useState("");
  const [restart, setRestart] = useState(true);
  const [newName, setNewName] = useState("");
  const [renames, setRenames] = useState({});
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function run(action, doneMessage) {
    setIsBusy(true);
    setMessage("");
    try {
      const result = await action();
      setMessage(typeof doneMessage === "function" ? doneMessage(result) : doneMessage);
      onChanged();
      return true;
    } catch (failure) {
      setMessage(failure.message ?? "Something went wrong.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }

  // The window of "older" notes: the suggestion's, or what was typed.
  const manual = choosing || !suggestion;
  const oldFrom = manual ? fromDateTimeInput(from) : suggestion.from;
  const oldUntil = manual ? fromDateTimeInput(until, { endOfMinute: true }) : suggestion.until;
  const hasWindow = Boolean(oldFrom || oldUntil);
  const older = describeNotes(hasWindow ? here.filter((entry) => inWindow(entry, oldFrom, oldUntil)) : []);
  const newer = describeNotes(hasWindow ? here.filter((entry) => !inWindow(entry, oldFrom, oldUntil)) : []);

  function split() {
    const question =
      `Move these ${notesWord(older.count)} into their own older campaign? The other ${newer.count} stay as your current ` +
      "campaign. Nothing is deleted, and you can move any note back afterwards.";
    if (!window.confirm(question)) return;
    run(
      () => splitCampaign(tableId, { oldFrom, oldUntil, firstName, secondName, restartSecond: restart }),
      "Done. Your older notes now have their own campaign. The journal shows your current one; use the Campaign list above it to read the older one.",
    );
  }

  return (
    <details className="campaign-tools">
      <summary className="campaign-tools__summary">Campaigns{hasSeveral ? ` (${numbers.length})` : ""}</summary>
      <div className="campaign-tools__body">
        {!hasSeveral ? (
          <>
            <p className="campaign-tools__hint">
              Is this journal holding two campaigns? You can move the older one into its own campaign. It stays readable
              here, and nothing is deleted.
            </p>

            {!manual ? (
              <div className="campaign-tools__ask">
                <p className="campaign-tools__question">Are these your older campaign&apos;s notes?</p>
                <p>
                  {suggestion.kind === "batch" ? (
                    <>
                      <b>{notesWord(older.count)}</b>
                      {whoWrote(older, 1)}, written {when(older)}.
                    </>
                  ) : (
                    <>
                      <b>{notesWord(older.count)}</b> from before a pause of about {Math.round(suggestion.gapDays / 30) >= 2 ? `${Math.round(suggestion.gapDays / 30)} months` : `${suggestion.gapDays} days`}.
                    </>
                  )}
                </p>
                <p className="campaign-tools__edge" role="status">
                  Everything else ({notesWord(newer.count)}
                  {whoWrote(newer)}) stays as your current campaign.
                </p>
                <div className="campaign-tools__buttons">
                  <button
                    type="button"
                    className="campaign-tools__button campaign-tools__button--primary"
                    onClick={split}
                    disabled={isBusy || older.count === 0}
                  >
                    {isBusy ? "Working..." : "Yes, move them"}
                  </button>
                  <button type="button" className="campaign-tools__button" onClick={() => setChoosing(true)}>
                    No, I&apos;ll choose
                  </button>
                </div>
              </div>
            ) : (
              <div className="campaign-tools__ask">
                <p className="campaign-tools__question">When were the older campaign&apos;s notes written?</p>
                <div className="campaign-tools__fields">
                  <label htmlFor={`${baseId}-from`}>From</label>
                  <input
                    id={`${baseId}-from`}
                    type="datetime-local"
                    className="campaign-tools__input"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                  <label htmlFor={`${baseId}-until`}>Until</label>
                  <input
                    id={`${baseId}-until`}
                    type="datetime-local"
                    className="campaign-tools__input"
                    value={until}
                    onChange={(event) => setUntil(event.target.value)}
                  />
                  <p className="campaign-tools__edge">Leave one blank for no limit, such as everything before a certain day.</p>
                </div>
                {hasWindow && (
                  <div className="campaign-tools__preview" role="status">
                    <p>
                      <b>Older campaign:</b> {notesWord(older.count)}
                      {whoWrote(older)}
                    </p>
                    <p>
                      <b>Current campaign:</b> {notesWord(newer.count)}
                      {whoWrote(newer)}
                    </p>
                    {older.count === 0 && <p className="campaign-tools__warning">No notes fall in that window. Check the dates.</p>}
                    {newer.count === 0 && <p className="campaign-tools__warning">Every note falls in that window, so nothing would be left in the current campaign.</p>}
                  </div>
                )}
                <div className="campaign-tools__buttons">
                  <button
                    type="button"
                    className="campaign-tools__button campaign-tools__button--primary"
                    onClick={split}
                    disabled={!hasWindow || isBusy || older.count === 0 || newer.count === 0}
                  >
                    {isBusy ? "Working..." : "Move the older notes"}
                  </button>
                  {suggestion && (
                    <button type="button" className="campaign-tools__button" onClick={() => setChoosing(false)}>
                      Back to the suggestion
                    </button>
                  )}
                </div>
              </div>
            )}

            <details className="campaign-tools__more">
              <summary>More options</summary>
              <div className="campaign-tools__fields">
                <label htmlFor={`${baseId}-first`}>Name for the older campaign</label>
                <input
                  id={`${baseId}-first`}
                  className="campaign-tools__input"
                  maxLength={60}
                  placeholder="Optional, like “Ash's campaign”"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
                <label htmlFor={`${baseId}-second`}>Name for the current campaign</label>
                <input
                  id={`${baseId}-second`}
                  className="campaign-tools__input"
                  maxLength={60}
                  placeholder="Optional, like “Two Years Later”"
                  value={secondName}
                  onChange={(event) => setSecondName(event.target.value)}
                />
                <label className="campaign-tools__check">
                  <input type="checkbox" checked={restart} onChange={(event) => setRestart(event.target.checked)} />
                  Number the current campaign&apos;s sessions from 1
                </label>
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="campaign-tools__hint">
              This table has {numbers.length} campaigns. Anyone can read the older ones from the Campaign list above the
              journal. To fix a note on the wrong side, use its <b>Move</b> list.
            </p>
            <ul className="campaign-tools__list">
              {[...numbers].reverse().map((number) => (
                <li key={number}>
                  <label htmlFor={`${baseId}-name-${number}`}>{campaignLabel({}, number)}</label>
                  <input
                    id={`${baseId}-name-${number}`}
                    className="campaign-tools__input"
                    maxLength={60}
                    placeholder="Add a name"
                    value={renames[number] ?? String(campaignNames[String(number)] ?? "")}
                    onChange={(event) => setRenames({ ...renames, [number]: event.target.value })}
                  />
                  <button
                    type="button"
                    className="campaign-tools__button"
                    disabled={isBusy || renames[number] === undefined}
                    onClick={() => run(() => nameCampaign(tableId, number, renames[number]), "Name saved.")}
                  >
                    Save name
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        <details className="campaign-tools__more">
          <summary>Start a brand new campaign</summary>
          <div className="campaign-tools__fields">
            <label htmlFor={`${baseId}-new`}>Starting a brand new campaign from session 1?</label>
            <input
              id={`${baseId}-new`}
              className="campaign-tools__input"
              maxLength={60}
              placeholder={`Name for campaign ${campaignNumber + 1} (optional)`}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button
              type="button"
              className="campaign-tools__button"
              disabled={isBusy}
              onClick={() => {
                if (!window.confirm(`Start campaign ${campaignNumber + 1}? New notes will go under it, starting at session 1. Everything so far stays as campaign ${campaignNumber}.`)) return;
                run(() => startCampaign(tableId, newName), `Campaign ${campaignNumber + 1} has started.`).then((ok) => ok && setNewName(""));
              }}
            >
              Start campaign {campaignNumber + 1}
            </button>
          </div>
        </details>

        <p className="campaign-tools__message" role="status">
          {message}
        </p>
      </div>
    </details>
  );
}

export default CampaignTools;

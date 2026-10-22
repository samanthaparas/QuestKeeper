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
  toDateTimeInput,
} from "../../utils/campaigns";
import { formatStamp } from "../../utils/journal";
import "./CampaignTools.css";

// The "Campaigns" panel on the Story tab, for anyone at the table. A table can
// run several campaigns one after another ("season 2"); each keeps its own
// session numbers (1.1 to 1.43, then 2.1, 2.2...).
//
// For a journal where two campaigns got mixed together, "Split into two
// campaigns" asks WHEN the older campaign's notes were written (they may have
// been typed in long after the newer ones, all in one evening). Notes written
// in that window become the older campaign; every other note becomes the new,
// current one. Nothing is deleted or rewritten: only which campaign a note
// belongs to changes, and any single note can be moved back afterwards.
//
// entries: the notes this person can see. campaignNumber / campaignNames: the
// table's current campaign and the names given so far. onChanged(): refresh.

// "15 notes by Ash Moonshade · Thu 7:22 pm to Thu 8:34 pm · sessions 1 to 1"
function summarize(group) {
  const writers = group.writers.slice(0, 3).map((writer) => `${writer.name} (${writer.count})`).join(", ");
  const more = group.writers.length > 3 ? ` and ${group.writers.length - 3} more` : "";
  const when = group.first ? ` · written ${formatStamp(group.first)}${group.last && group.last !== group.first ? ` to ${formatStamp(group.last)}` : ""}` : "";
  const sessions =
    group.firstSession === null
      ? ""
      : group.firstSession === group.lastSession
        ? ` · session ${group.firstSession}`
        : ` · sessions ${group.firstSession} to ${group.lastSession}`;
  return `${group.count} ${group.count === 1 ? "note" : "notes"}${writers ? ` by ${writers}${more}` : ""}${when}${sessions}`;
}

function CampaignTools({ tableId, entries = [], campaignNumber = 1, campaignNames = {}, onChanged = () => {} }) {
  const baseId = useId();
  const numbers = campaignNumbers(entries, campaignNumber);
  const hasSeveral = numbers.length > 1;

  const here = entries.filter((entry) => campaignOf(entry) === campaignNumber);
  const suggestion = suggestOlderNotes(here);
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

  const oldFrom = fromDateTimeInput(from);
  const oldUntil = fromDateTimeInput(until, { endOfMinute: true });
  const hasWindow = Boolean(oldFrom || oldUntil);
  const olderNotes = hasWindow ? here.filter((entry) => inWindow(entry, oldFrom, oldUntil)) : [];
  const newerNotes = hasWindow ? here.filter((entry) => !inWindow(entry, oldFrom, oldUntil)) : [];
  const older = describeNotes(olderNotes);
  const newer = describeNotes(newerNotes);

  function useSuggestion() {
    setFrom(suggestion.from ? toDateTimeInput(suggestion.from) : "");
    // The whole minute of the last note counts, so the box shows its own minute.
    setUntil(suggestion.until ? toDateTimeInput(suggestion.until) : "");
  }

  function split() {
    const question =
      `Split into two campaigns? The ${older.count} ${older.count === 1 ? "note" : "notes"} written in that window become ` +
      `the older campaign, and the other ${newer.count} become “${secondName.trim() || "Campaign " + (campaignNumber + 1)}”, the current one. ` +
      "Nothing is deleted, and you can move any note back afterwards.";
    if (!window.confirm(question)) return;
    run(
      () => splitCampaign(tableId, { oldFrom, oldUntil, firstName, secondName, restartSecond: restart }),
      (result) => `Done. ${result.kept} ${result.kept === 1 ? "note stays" : "notes stay"} in the older campaign and ${result.moved} moved to the new one.`,
    );
  }

  return (
    <details className="campaign-tools">
      <summary className="campaign-tools__summary">Campaigns{hasSeveral ? ` (${numbers.length})` : ""}</summary>
      <div className="campaign-tools__body">
        {!hasSeveral ? (
          <>
            <p className="campaign-tools__hint">
              Did your group start a new campaign (a “season 2”) in this same journal? Say when the <b>older</b>{" "}
              campaign&apos;s notes were written and they move into their own campaign, still readable here. Everything
              else becomes your current campaign, with its own session numbers.
            </p>

            {suggestion && (
              <p className="campaign-tools__suggestion">
                {suggestion.kind === "batch" ? (
                  <>
                    I noticed {suggestion.count} notes by {suggestion.writer} written within about {suggestion.minutes}{" "}
                    {suggestion.minutes === 1 ? "minute" : "minutes"} of each other. That often means an older campaign
                    was typed in all at once.{" "}
                  </>
                ) : (
                  <>
                    I noticed a pause of about {Math.round(suggestion.gapDays / 30) >= 2 ? `${Math.round(suggestion.gapDays / 30)} months` : `${suggestion.gapDays} days`} in
                    your notes, so everything before it might be the older campaign.{" "}
                  </>
                )}
                <button type="button" className="campaign-tools__link" onClick={useSuggestion}>
                  Use this
                </button>{" "}
                (then check the two groups below)
              </p>
            )}

            <div className="campaign-tools__fields">
              <label htmlFor={`${baseId}-from`}>The older campaign&apos;s notes were written from</label>
              <input
                id={`${baseId}-from`}
                type="datetime-local"
                className="campaign-tools__input"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <label htmlFor={`${baseId}-until`}>until</label>
              <input
                id={`${baseId}-until`}
                type="datetime-local"
                className="campaign-tools__input"
                value={until}
                onChange={(event) => setUntil(event.target.value)}
              />
              <p className="campaign-tools__edge">Leave one blank for no limit, such as everything before a certain day.</p>
              <label htmlFor={`${baseId}-first`}>Name for the older campaign (optional)</label>
              <input
                id={`${baseId}-first`}
                className="campaign-tools__input"
                maxLength={60}
                placeholder="The first campaign"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
              <label htmlFor={`${baseId}-second`}>Name for the current campaign (optional)</label>
              <input
                id={`${baseId}-second`}
                className="campaign-tools__input"
                maxLength={60}
                placeholder="Season 2"
                value={secondName}
                onChange={(event) => setSecondName(event.target.value)}
              />
              <label className="campaign-tools__check">
                <input type="checkbox" checked={restart} onChange={(event) => setRestart(event.target.checked)} />
                Number the current campaign&apos;s sessions from 1
              </label>
            </div>

            {hasWindow && (
              <div className="campaign-tools__preview" role="status">
                <p>
                  <b>Older campaign:</b> {summarize(older)}
                </p>
                <p>
                  <b>Current campaign:</b> {summarize(newer)}
                </p>
                {older.count === 0 && <p className="campaign-tools__warning">No notes fall in that window. Check the dates.</p>}
                {newer.count === 0 && <p className="campaign-tools__warning">Every note falls in that window, so nothing would be in the current campaign.</p>}
                <p className="campaign-tools__edge">
                  Counts include the notes you can see. Private notes by players are sorted by date too, without being read.
                </p>
              </div>
            )}

            <button
              type="button"
              className="campaign-tools__button campaign-tools__button--primary"
              onClick={split}
              disabled={!hasWindow || isBusy || older.count === 0}
            >
              {isBusy ? "Working..." : "Split into two campaigns"}
            </button>
          </>
        ) : (
          <>
            <p className="campaign-tools__hint">
              This table has {numbers.length} campaigns. Anyone can read the older ones from the Campaign list above the journal.
              {" "}To fix a note on the wrong side, use its <b>Move</b> list.
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

        <p className="campaign-tools__message" role="status">
          {message}
        </p>
      </div>
    </details>
  );
}

export default CampaignTools;

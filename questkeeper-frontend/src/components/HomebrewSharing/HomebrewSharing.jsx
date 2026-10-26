import { useEffect, useState } from "react";
import { listMyTables } from "../../utils/tableStore";
import {
  listMyTableShares,
  shareWithTable,
  stopSharingWithTable,
  createInvite,
  listPendingInvites,
  cancelInvite,
  inviteUrl,
  listGrants,
  removeGrant,
} from "../../utils/homebrewStore";
import Button from "../Button/Button";
import StatusNote from "../StatusNote/StatusNote";
import "./HomebrewSharing.css";

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Everything about who can see your homebrew: tables, invite links, and the
// people on both sides of an accepted invite.
//
// onGrantsChange(grants): lets the page label "Shared by Sam" entries.
// onAccessRemoved(): you removed someone's homebrew from your account, so
// the page should reload the entries.
function HomebrewSharing({ userId, onGrantsChange, onAccessRemoved }) {
  const [tables, setTables] = useState([]);
  const [sharedTableIds, setSharedTableIds] = useState([]);
  const [invites, setInvites] = useState([]);
  const [grants, setGrants] = useState({ sharedByMe: [], sharedWithMe: [] });
  const [inviteForm, setInviteForm] = useState({ recipient: "", sender: "" });
  const [newLink, setNewLink] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  // The sharing details couldn't load (a retry can help); until they have, the lists stay out of sight
  // so "nobody yet" isn't shown for something that simply hasn't arrived.
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // When the page opened, for marking expired links (read once, not every render).
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let ignore = false;

    Promise.all([
      listMyTables(),
      listMyTableShares(userId),
      listPendingInvites(),
      listGrants(userId),
    ])
      .then(([myTables, shares, pending, myGrants]) => {
        if (ignore) return;
        setTables(myTables);
        setSharedTableIds(shares);
        setInvites(pending);
        setGrants(myGrants);
        setLoaded(true);
        setLoadFailed(false);
        onGrantsChange?.(myGrants);
      })
      .catch(() => !ignore && setLoadFailed(true));

    return () => {
      ignore = true;
    };
    // Load once per user; the callback is only used to report back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, attempt]);

  function updateGrants(next) {
    setGrants(next);
    onGrantsChange?.(next);
  }

  // Wraps each action so a failure shows a message instead of breaking the page.
  async function run(action) {
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(actionError.message ?? "Something went wrong.");
    }
  }

  function toggleTable(tableId) {
    run(async () => {
      if (sharedTableIds.includes(tableId)) {
        await stopSharingWithTable(userId, tableId);
        setSharedTableIds((ids) => ids.filter((id) => id !== tableId));
      } else {
        await shareWithTable(tableId);
        setSharedTableIds((ids) => [...ids, tableId]);
      }
    });
  }

  function handleCreateInvite(event) {
    event.preventDefault();
    if (!inviteForm.recipient.trim() || !inviteForm.sender.trim()) {
      setError("Fill in who it's for and how you'd like to appear.");
      return;
    }
    run(async () => {
      const invite = await createInvite({
        recipientLabel: inviteForm.recipient,
        senderLabel: inviteForm.sender,
      });
      setInvites((previous) => [invite, ...previous]);
      setNewLink(inviteUrl(invite.code));
      // Keep "your name" for the next invite; clear who it's for.
      setInviteForm((previous) => ({ ...previous, recipient: "" }));
    });
  }

  function copyLink(link) {
    run(async () => {
      await navigator.clipboard.writeText(link);
      setCopied(link);
    });
  }

  function handleCancelInvite(invite) {
    run(async () => {
      await cancelInvite(invite.id);
      setInvites((previous) => previous.filter((item) => item.id !== invite.id));
    });
  }

  function handleRevoke(grant) {
    if (!window.confirm(`Stop sharing your homebrew with ${grant.recipient_label}?`)) return;
    run(async () => {
      await removeGrant(grant.owner_id, grant.grantee_id);
      updateGrants({
        ...grants,
        sharedByMe: grants.sharedByMe.filter((item) => item !== grant),
      });
    });
  }

  function handleLeave(grant) {
    if (!window.confirm(`Remove ${grant.sender_label}'s homebrew from your account?`)) return;
    run(async () => {
      await removeGrant(grant.owner_id, grant.grantee_id);
      updateGrants({
        ...grants,
        sharedWithMe: grants.sharedWithMe.filter((item) => item !== grant),
      });
      onAccessRemoved?.();
    });
  }

  return (
    <section className="homebrew-sharing" aria-labelledby="homebrew-sharing-title">
      <h2 id="homebrew-sharing-title" className="homebrew-sharing__title">
        Sharing
      </h2>
      <p className="homebrew-sharing__intro">
        Entries marked "Shared" are visible to everyone at the tables you tick
        and to anyone who accepts one of your invite links. Drafts stay private.
      </p>

      {error && <StatusNote variant="error">{error}</StatusNote>}
      {!loaded && !loadFailed && <StatusNote variant="loading">Loading your sharing details...</StatusNote>}
      {loadFailed && (
        <StatusNote
          variant="error"
          onRetry={() => {
            setLoadFailed(false);
            setAttempt((count) => count + 1);
          }}
        >
          Couldn&apos;t load your sharing details. Check your connection and try again.
        </StatusNote>
      )}

      <div className="homebrew-sharing__content" hidden={!loaded}>
      <div className="homebrew-sharing__block">
        <h3 className="homebrew-sharing__heading">Your tables</h3>
        {tables.length === 0 ? (
          <p className="homebrew-sharing__empty">
            You're not at any tables yet. Create or join one on the Tables page.
          </p>
        ) : (
          tables.map((table) => (
            <label className="homebrew-sharing__check" key={table.id}>
              <input
                type="checkbox"
                checked={sharedTableIds.includes(table.id)}
                onChange={() => toggleTable(table.id)}
              />
              {table.name}
              {table.dm_id === userId && (
                <span className="homebrew-sharing__tag">You're the DM</span>
              )}
            </label>
          ))
        )}
      </div>

      <form className="homebrew-sharing__block" onSubmit={handleCreateInvite}>
        <h3 className="homebrew-sharing__heading">Invite someone</h3>
        <p className="homebrew-sharing__hint">
          Makes a one-time link to send them (by text, Discord, anything). It
          works once and expires after 14 days if unused. Once accepted, they
          keep access until you or they remove it.
        </p>
        <div className="homebrew-sharing__row">
          <label className="homebrew-sharing__field">
            <span className="homebrew-sharing__label">Who it's for</span>
            <input
              className="homebrew-sharing__input"
              placeholder="e.g. Jordan"
              maxLength={40}
              value={inviteForm.recipient}
              onChange={(event) =>
                setInviteForm({ ...inviteForm, recipient: event.target.value })
              }
            />
          </label>
          <label className="homebrew-sharing__field">
            <span className="homebrew-sharing__label">Your name, as they'll see it</span>
            <input
              className="homebrew-sharing__input"
              placeholder="e.g. Sam"
              maxLength={40}
              value={inviteForm.sender}
              onChange={(event) =>
                setInviteForm({ ...inviteForm, sender: event.target.value })
              }
            />
          </label>
          <Button type="submit">Make invite link</Button>
        </div>

        {newLink && (
          <div className="homebrew-sharing__link" role="status">
            <code className="homebrew-sharing__code">{newLink}</code>
            <Button type="button" variant="secondary" onClick={() => copyLink(newLink)}>
              {copied === newLink ? "Copied" : "Copy link"}
            </Button>
          </div>
        )}
      </form>

      {invites.length > 0 && (
        <div className="homebrew-sharing__block">
          <h3 className="homebrew-sharing__heading">Waiting to be accepted</h3>
          <ul className="homebrew-sharing__list">
            {invites.map((invite) => {
              const isExpired = new Date(invite.expires_at).getTime() < now;
              const link = inviteUrl(invite.code);
              return (
                <li className="homebrew-sharing__item" key={invite.id}>
                  <span>
                    For {invite.recipient_label}
                    <span className="homebrew-sharing__meta">
                      {isExpired
                        ? " · expired"
                        : ` · expires ${formatDate(invite.expires_at)}`}
                    </span>
                  </span>
                  <span className="homebrew-sharing__actions">
                    {!isExpired && (
                      <Button variant="secondary" onClick={() => copyLink(link)}>
                        {copied === link ? "Copied" : "Copy link"}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => handleCancelInvite(invite)}>
                      {isExpired ? "Remove" : "Cancel"}
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="homebrew-sharing__block">
        <h3 className="homebrew-sharing__heading">People who can see your homebrew</h3>
        {grants.sharedByMe.length === 0 ? (
          <p className="homebrew-sharing__empty">Nobody has accepted an invite yet.</p>
        ) : (
          <ul className="homebrew-sharing__list">
            {grants.sharedByMe.map((grant) => (
              <li className="homebrew-sharing__item" key={grant.grantee_id}>
                <span>
                  {grant.recipient_label}
                  <span className="homebrew-sharing__meta">
                    {` · since ${formatDate(grant.created_at)}`}
                  </span>
                </span>
                <Button variant="danger" onClick={() => handleRevoke(grant)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="homebrew-sharing__block">
        <h3 className="homebrew-sharing__heading">Shared with you</h3>
        {grants.sharedWithMe.length === 0 ? (
          <p className="homebrew-sharing__empty">
            When someone sends you an invite link and you accept it, they'll show
            up here.
          </p>
        ) : (
          <ul className="homebrew-sharing__list">
            {grants.sharedWithMe.map((grant) => (
              <li className="homebrew-sharing__item" key={grant.owner_id}>
                <span>{grant.sender_label}'s homebrew</span>
                <Button variant="secondary" onClick={() => handleLeave(grant)}>
                  Remove from my account
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </section>
  );
}

export default HomebrewSharing;

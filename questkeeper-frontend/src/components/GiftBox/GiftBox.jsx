import { useState } from "react";
import Button from "../Button/Button";
import "./GiftBox.css";

// The gift box at the top of Inventory: items another player gave this
// character (Take it, or Give back), and ones this character gave that
// haven't been taken yet (Take it back). See 20261122_item_gifts.sql.
//
// gifts: { incoming, outgoing } from listGiftsFor. Each handler gets the
// gift and returns a promise; an error shows here.
function GiftBox({ gifts, onTake, onReturn, onCancel }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const incoming = gifts?.incoming ?? [];
  const outgoing = gifts?.outgoing ?? [];
  if (incoming.length === 0 && outgoing.length === 0) return null;

  async function act(gift, action) {
    setError("");
    setBusyId(gift.id);
    try {
      await action(gift);
    } catch (failure) {
      setError(failure?.message ?? "That didn't work. Try again in a moment.");
    } finally {
      setBusyId(null);
    }
  }

  const what = (gift) => {
    const count = Number(gift.item?.quantity) || 1;
    return count > 1 ? `${count} ${gift.item?.name}` : gift.item?.name;
  };

  return (
    <section className="gift-box" aria-label="Gifts">
      {incoming.map((gift) => (
        <p className="gift-box__row" key={gift.id}>
          <span>
            <span aria-hidden="true">📦</span> <strong>{gift.from_name || "Someone"}</strong> gave you{" "}
            <strong>{what(gift)}</strong>.
          </span>
          <span className="gift-box__buttons">
            <Button disabled={busyId === gift.id} onClick={() => act(gift, onTake)}>
              Take it
            </Button>
            <Button variant="secondary" disabled={busyId === gift.id} onClick={() => act(gift, onReturn)}>
              Give back
            </Button>
          </span>
        </p>
      ))}
      {outgoing.map((gift) => (
        <p className="gift-box__row gift-box__row--sent" key={gift.id}>
          <span>
            Waiting for <strong>{gift.to_name || "them"}</strong> to take <strong>{what(gift)}</strong>.
          </span>
          <Button variant="secondary" disabled={busyId === gift.id} onClick={() => act(gift, onCancel)}>
            Take it back
          </Button>
        </p>
      ))}
      {error && (
        <p className="gift-box__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default GiftBox;

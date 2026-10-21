import { useState } from "react";
import { getMagicItemCatalog } from "../../utils/api";
import { DIFFICULTIES, DIFFICULTY_LABELS } from "../../utils/encounters";
import { rollCoins, rollHoard, rollItem } from "../../utils/loot";
import "./LootHelper.css";

// The DM's loot ideas, on the Prep tab: coins, a magic item, or a small
// hoard, scaled to the party's level and how hard the fight was. They're
// ideas to start from, never a rule: roll again, copy what you like, change
// anything. Nothing here is shown to players.
//
// levels: the party's character levels (from the table's players).

const roundedAverage = (levels) =>
  levels.length === 0 ? 3 : Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length);

const itemLine = ({ item, rarity }) =>
  `${item.name} (${rarity}${item.attunement ? ", needs attunement" : ""}${item.type ? `, ${String(item.type).toLowerCase()}` : ""})`;

function LootHelper({ levels = [] }) {
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [level, setLevel] = useState(() => roundedAverage(levels));
  const [fight, setFight] = useState("medium");
  const [consumablesOnly, setConsumablesOnly] = useState(false);
  // What was last rolled for each kind: null until rolled.
  const [coins, setCoins] = useState(null);
  const [item, setItem] = useState(undefined); // undefined: not rolled; null: nothing fit
  const [hoard, setHoard] = useState(null);
  const [message, setMessage] = useState("");

  // The item list loads the first time this is opened (coins don't need it).
  function handleToggle(event) {
    if (!event.currentTarget.open || catalog || loadError) return;
    getMagicItemCatalog()
      .then(setCatalog)
      .catch(() => setLoadError("Couldn't load the magic item list, so items and hoards may be missing items."));
  }

  const hoardText = (found) =>
    [
      `Coins: ${found.coins.text}`,
      ...found.valuables.map((valuable) => `Valuable: ${valuable.text}`),
      ...found.items.map((entry) => `Item: ${itemLine(entry)}`),
    ].join("\n");

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied.");
    } catch {
      setMessage("Couldn't copy. Select the text and copy it yourself.");
    }
  }

  return (
    <details className="loot-helper" onToggle={handleToggle}>
      <summary className="loot-helper__summary">Loot ideas</summary>
      <div className="loot-helper__body">
        <p className="loot-helper__hint">
          Ideas for what a fight leaves behind. Roll again for another, and keep whatever you like. Players never see
          this.
        </p>
        {loadError && (
          <p className="loot-helper__error" role="alert">
            {loadError}
          </p>
        )}

        <div className="loot-helper__setup">
          <label>
            Party level{" "}
            <input
              type="number"
              min="1"
              max="20"
              className="loot-helper__number"
              value={level}
              onChange={(event) => setLevel(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
            />
          </label>
          <div className="loot-helper__pills" role="radiogroup" aria-label="How hard was the fight">
            {DIFFICULTIES.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={fight === name}
                className="loot-helper__pill"
                onClick={() => setFight(name)}
              >
                {DIFFICULTY_LABELS[name]}
              </button>
            ))}
          </div>
        </div>

        <section className="loot-helper__idea" aria-label="Coins">
          <h3 className="loot-helper__title">Coins</h3>
          <button type="button" className="loot-helper__button" onClick={() => setCoins(rollCoins({ level, fight }))}>
            {coins ? "Roll again" : "Roll coins"}
          </button>
          {coins && (
            <p className="loot-helper__result">
              {coins.text}{" "}
              <button type="button" className="loot-helper__link" onClick={() => copy(coins.text)}>
                Copy
              </button>
            </p>
          )}
        </section>

        <section className="loot-helper__idea" aria-label="A magic item">
          <h3 className="loot-helper__title">A magic item</h3>
          <button
            type="button"
            className="loot-helper__button"
            disabled={!catalog}
            onClick={() => setItem(rollItem({ level, fight, catalog, consumablesOnly }))}
          >
            {item !== undefined ? "Roll again" : "Roll an item"}
          </button>
          <label className="loot-helper__check">
            <input type="checkbox" checked={consumablesOnly} onChange={(event) => setConsumablesOnly(event.target.checked)} />
            Potions, scrolls and other one-use items only
          </label>
          {item === null && <p className="loot-helper__result">Nothing fits that. Try again without the filter.</p>}
          {item && (
            <p className="loot-helper__result">
              <b>{item.item.name}</b> ({item.rarity}
              {item.item.attunement ? ", needs attunement" : ""}) <span className="loot-helper__meta">{item.item.source}</span>{" "}
              <a className="loot-helper__link" href="#/magic-items" target="_blank" rel="noopener noreferrer">
                Look it up
              </a>{" "}
              <button type="button" className="loot-helper__link" onClick={() => copy(itemLine(item))}>
                Copy
              </button>
            </p>
          )}
        </section>

        <section className="loot-helper__idea" aria-label="A small hoard">
          <h3 className="loot-helper__title">A small hoard</h3>
          <button
            type="button"
            className="loot-helper__button"
            disabled={!catalog}
            onClick={() => setHoard(rollHoard({ level, fight, catalog }))}
          >
            {hoard ? "Roll again" : "Roll a hoard"}
          </button>
          {hoard && (
            <div className="loot-helper__result">
              <ul className="loot-helper__list">
                <li>Coins: {hoard.coins.text}</li>
                {hoard.valuables.map((valuable) => (
                  <li key={valuable.text}>{valuable.text}</li>
                ))}
                {hoard.items.map((entry) => (
                  <li key={entry.item.index}>{itemLine(entry)}</li>
                ))}
              </ul>
              <button type="button" className="loot-helper__link" onClick={() => copy(hoardText(hoard))}>
                Copy
              </button>
            </div>
          )}
        </section>

        <p className="loot-helper__message" role="status">
          {message}
        </p>
      </div>
    </details>
  );
}

export default LootHelper;

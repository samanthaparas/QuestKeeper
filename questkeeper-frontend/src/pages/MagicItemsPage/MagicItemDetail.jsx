import { useEffect, useState } from "react";
import { getMagicItemCatalogEntry } from "../../utils/api";
import { groupMarkdownTables } from "../../utils/srdDetails";
import { attunementLine, kindLine, rarityClass } from "../../utils/magicItemFilters";
import { OFFICIAL_BOOKS_GROUP } from "../../utils/bookBackgrounds";
import { SrdBlocks } from "../../components/DetailPanel/DetailPanel";
import SourceBadge from "../../components/SourceBadge/SourceBadge";

// Open5e text uses blank lines between paragraphs and markdown tables.
function toBlocks(text) {
  const lines = String(text ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/\*\*/g, "").trim())
    .filter(Boolean);
  return groupMarkdownTables(lines);
}

// The full picture of one item: its facts, then its description (open-licensed
// items) or a link to the full write-up (book items).
function MagicItemDetail({ item }) {
  const [loaded, setLoaded] = useState(null); // { index, data } or { index, error }

  useEffect(() => {
    if (item.is_book_entry) return;
    let ignore = false;
    getMagicItemCatalogEntry(item.index)
      .then((data) => !ignore && setLoaded({ index: item.index, data }))
      .catch(() => !ignore && setLoaded({ index: item.index, error: true }));
    return () => {
      ignore = true;
    };
  }, [item]);

  const detail = loaded?.index === item.index ? loaded : null;
  const kind = kindLine(item);
  const facts = [
    ["Type", [item.type, kind].filter(Boolean).join(" · ")],
    ["Rarity", item.rarity],
    ["Attunement", attunementLine(item) ?? "Not required"],
    ["Worn", item.wornSlot && item.wornSlot !== "Armor" ? item.wornSlot : null],
    ["Consumable", item.consumable === true ? "Yes, it's used up when used" : item.consumable === false ? "No" : null],
    ["Useful for", item.usefulFor.length > 0 ? item.usefulFor.join(", ") : null],
    ["Versions", item.versions.length > 0 ? item.versions.join(", ") : null],
    ["Kinds", item.kinds.length > 3 ? item.kinds.join(", ") : null],
  ].filter(([, value]) => value);

  return (
    <section className="detail-panel magic-item-detail" aria-label={item.name}>
      <h2 className="detail-panel__title">{item.name}</h2>
      <p className="magic-item-detail__badges">
        <span className={rarityClass(item.rarity)}>{item.rarity}</span>{" "}
        <SourceBadge source={item.source} official={item.sourceGroup === OFFICIAL_BOOKS_GROUP} />
        {item.edition && !item.is_book_entry && (
          <span className="magic-item-detail__edition">{item.edition} rules</span>
        )}
      </p>

      <dl className="magic-item-detail__facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {item.is_book_entry ? (
        <>
          <p className="book-entry__note">
            This book's text is copyrighted, so QuestKeeper lists the facts and
            links to the full write-up instead.
          </p>
          <a className="book-entry__link" href={item.link_url} target="_blank" rel="noopener noreferrer">
            Read the full item on Wikidot
          </a>
        </>
      ) : (
        <div className="magic-item-detail__text">
          {!detail && <p>Loading the description...</p>}
          {detail?.error && <p>Couldn't load the description. Please try again later.</p>}
          {detail?.data?.desc && <SrdBlocks blocks={toBlocks(detail.data.desc)} />}
          {/* Versions with different text (e.g. each Belt of Giant Strength). */}
          {detail?.data?.versionDetails?.map((version) => (
            <div key={version.name} className="magic-item-detail__version">
              <h3>
                {version.name}
                {version.rarity && <span className={rarityClass(version.rarity)}>{version.rarity}</span>}
              </h3>
              <SrdBlocks blocks={toBlocks(version.desc)} />
            </div>
          ))}
          {item.usefulFor.length > 0 && (
            <p className="magic-item-detail__hint">
              Type, worn slot, consumable and "useful for" are worked out from the
              description, so double-check anything that matters at the table.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default MagicItemDetail;

import { getMagicItemIcon } from "../../utils/icons";
import SourceBadge from "../../components/SourceBadge/SourceBadge";
import { OFFICIAL_BOOKS_GROUP } from "../../utils/bookBackgrounds";
import { attunementLine, kindLine, rarityClass } from "../../utils/magicItemFilters";

// One item in the list: everything a player or DM scans for, at a glance.
// id: from the page, so focus can come back here when the details close.
function MagicItemCard({ item, isSelected, onSelect, id }) {
  const kind = kindLine(item);
  const attunement = attunementLine(item);

  return (
    <button
      id={id}
      type="button"
      className={`magic-item-card${isSelected ? " magic-item-card--selected" : ""}`}
      onClick={() => onSelect(item)}
      aria-pressed={isSelected}
    >
      <span className="magic-item-card__top">
        <span className="magic-item-card__name">{item.name}</span>
        <span className={rarityClass(item.rarity)}>{item.rarity}</span>
      </span>

      {/* What it is: "Weapon · Longsword", "Wondrous Item · Worn: Shoulders" */}
      <span className="magic-item-card__type">
        <img className="magic-item-card__icon" src={getMagicItemIcon(item.type)} alt="" aria-hidden="true" />
        <span>
          {item.type}
          {kind && ` · ${kind}`}
          {item.wornSlot && item.wornSlot !== item.type && item.wornSlot !== "Armor" && ` · Worn: ${item.wornSlot}`}
        </span>
      </span>

      {attunement && <span className="magic-item-card__attune">{attunement}</span>}

      <span className="magic-item-card__tags">
        {item.consumable === true && <span className="magic-item-tag magic-item-tag--consumable">Consumable</span>}
        {item.usefulFor.map((use) => (
          <span key={use} className="magic-item-tag">
            {use}
          </span>
        ))}
        <SourceBadge source={item.source} official={item.sourceGroup === OFFICIAL_BOOKS_GROUP} />
      </span>
    </button>
  );
}

export default MagicItemCard;

import {
  RARITIES,
  TYPES,
  SLOTS,
  USES,
  CLASSES,
  DEFAULT_FILTERS,
  activeFilterCount,
} from "../../utils/magicItemFilters";
import SourceFilter from "../../components/SourceFilter/SourceFilter";
import Button from "../../components/Button/Button";

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Select({ id, label, value, onChange, children }) {
  return (
    <label className="magic-item-filters__field" htmlFor={id}>
      <span className="magic-item-filters__label">{label}</span>
      <select id={id} className="magic-item-filters__select" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

function Chips({ label, options, selected, onChange, className = () => "" }) {
  return (
    <div className="magic-item-filters__chips-row">
      <span className="magic-item-filters__label">{label}</span>
      <div className="magic-item-filters__chips" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`magic-item-filters__chip ${className(option)}${selected.includes(option) ? " magic-item-filters__chip--active" : ""}`}
            aria-pressed={selected.includes(option)}
            onClick={() => onChange(toggle(selected, option))}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// Every filter on the Magic Items page. `items` are the search matches, for
// the source button counts.
function MagicItemFilters({ filters, onChange, items }) {
  const set = (changes) => onChange({ ...filters, ...changes });
  const count = activeFilterCount(filters);

  return (
    <details className="magic-item-filters" open>
      <summary className="magic-item-filters__summary">
        Filters{count > 0 ? ` (${count} on)` : ""}
      </summary>

      <div className="magic-item-filters__body">
        <Chips
          label="Rarity"
          options={RARITIES}
          selected={filters.rarity}
          onChange={(rarity) => set({ rarity })}
          className={(r) => `magic-item-filters__chip--${r.toLowerCase().replace(/\s+/g, "-")}`}
        />

        <div className="magic-item-filters__grid">
          <Select id="mi-type" label="Type" value={filters.type} onChange={(type) => set({ type })}>
            <option value="">Any type</option>
            {TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
          <Select id="mi-slot" label="Worn" value={filters.slot} onChange={(slot) => set({ slot })}>
            <option value="">Worn or not</option>
            <option value="worn">Anything you wear</option>
            {SLOTS.map((slot) => (
              <option key={slot}>{slot}</option>
            ))}
          </Select>
          <Select id="mi-consumable" label="Consumable" value={filters.consumable} onChange={(consumable) => set({ consumable })}>
            <option value="any">Either</option>
            <option value="only">Only consumables</option>
            <option value="hide">Hide consumables</option>
          </Select>
          <Select id="mi-attunement" label="Attunement" value={filters.attunement} onChange={(attunement) => set({ attunement })}>
            <option value="any">Either</option>
            <option value="required">Needs attunement</option>
            <option value="none">No attunement</option>
          </Select>
          <Select id="mi-usable" label="Usable by" value={filters.usableBy} onChange={(usableBy) => set({ usableBy })}>
            <option value="">Any class</option>
            {CLASSES.map((cls) => (
              <option key={cls} value={cls}>
                {capitalize(cls)}
              </option>
            ))}
          </Select>
          <Select id="mi-sort" label="Sort by" value={filters.sort} onChange={(sort) => set({ sort })}>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
          </Select>
        </div>

        <Chips label="Useful for" options={USES} selected={filters.uses} onChange={(uses) => set({ uses })} />

        <SourceFilter items={items} value={filters.source} onChange={(source) => set({ source })} />

        {count > 0 && (
          <Button variant="secondary" onClick={() => onChange({ ...DEFAULT_FILTERS, q: filters.q })}>
            Clear filters
          </Button>
        )}
      </div>
    </details>
  );
}

export default MagicItemFilters;

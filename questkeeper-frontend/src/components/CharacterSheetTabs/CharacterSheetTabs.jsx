import "./CharacterSheetTabs.css";

export const CHARACTER_SHEET_TABS = [
  { key: "actions", label: "Actions" },
  { key: "spells", label: "Spells", casterOnly: true },
  { key: "resources", label: "Resources" },
  { key: "inventory", label: "Inventory" },
  { key: "features", label: "Features" },
  { key: "story", label: "Story" },
];

function CharacterSheetTabs({ activeTab, onSelect, hasSpellcasting }) {
  const tabs = CHARACTER_SHEET_TABS.filter(
    (tab) => !tab.casterOnly || hasSpellcasting,
  );

  return (
    <div
      className="character-sheet-tabs"
      role="tablist"
      aria-label="Character sheet sections"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          className={`character-sheet-tabs__tab${
            activeTab === tab.key ? " character-sheet-tabs__tab--active" : ""
          }`}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default CharacterSheetTabs;

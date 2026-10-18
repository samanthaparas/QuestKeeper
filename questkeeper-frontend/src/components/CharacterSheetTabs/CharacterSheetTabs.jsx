import "./CharacterSheetTabs.css";

const CHARACTER_SHEET_TABS = [
  { key: "actions", label: "Actions" },
  { key: "spells", label: "Spells", casterOnly: true },
  { key: "resources", label: "Resources" },
  { key: "inventory", label: "Inventory" },
  { key: "features", label: "Features" },
  // Every roll made on this sheet, to look back at.
  { key: "rolls", label: "Rolls" },
  { key: "story", label: "Story" },
  // One journal tab. On its own it is the character's private journal; at a
  // table it also holds the table's handouts and shared journal, with a switch
  // between the two, so a player never has to leave their sheet during a session.
  { key: "journal", label: "Journal", tableLabel: "Journal & Handouts" },
];

// badges: { features: 2 } puts a small count on a tab (here, setup choices left).
function CharacterSheetTabs({ activeTab, onSelect, hasSpellcasting, hasTable = false, badges = {} }) {
  const tabs = CHARACTER_SHEET_TABS.filter((tab) => !tab.casterOnly || hasSpellcasting).map((tab) => ({
    ...tab,
    label: hasTable && tab.tableLabel ? tab.tableLabel : tab.label,
  }));

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
          // With a count on it, the tab says what the count means.
          aria-label={
            badges[tab.key] > 0
              ? `${tab.label} (${badges[tab.key]} ${badges[tab.key] === 1 ? "choice" : "choices"} left)`
              : undefined
          }
          className={`character-sheet-tabs__tab${
            activeTab === tab.key ? " character-sheet-tabs__tab--active" : ""
          }`}
          onClick={() => onSelect(tab.key)}
        >
          {tab.label}
          {badges[tab.key] > 0 && (
            <span className="character-sheet-tabs__badge" aria-hidden="true">
              {badges[tab.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default CharacterSheetTabs;

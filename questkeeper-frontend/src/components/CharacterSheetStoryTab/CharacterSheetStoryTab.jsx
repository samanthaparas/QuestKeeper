// The sheet's Story tab: backstory, appearance and traits, and notes. (The
// companion used to be here too; it now lives entirely on the Actions tab.)

function CharacterSheetStoryTab({
  backstory,
  showBackstory,
  onBackstoryChange,
  onToggleBackstoryVisibility,
  appearance,
  onAppearanceChange,
  notes,
  onNotesChange,
}) {
  return (
    <>
      <section className="character-sheet__section">
        <div className="character-sheet__section-header-row">
          <h2 className="character-sheet__section-title">Backstory</h2>
          <button
            type="button"
            className="character-sheet__resource-remove"
            onClick={onToggleBackstoryVisibility}
          >
            {showBackstory ? "Hide Section" : "Show Section"}
          </button>
        </div>

        {showBackstory ? (
          <textarea
            className="character-sheet__textarea"
            value={backstory ?? ""}
            onChange={(e) => onBackstoryChange(e.target.value)}
            placeholder='Who were you before the adventure? One sentence is enough to start, like "A runaway noble hiding from their family." Add more as you play.'
            rows={5}
          />
        ) : (
          <p className="character-sheet__empty-text">
            Backstory is hidden. Click "Show Section" to bring it back.
          </p>
        )}
      </section>

      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">
          Appearance &amp; Traits
        </h2>
        <textarea
          className="character-sheet__textarea"
          value={appearance ?? ""}
          onChange={(e) => onAppearanceChange(e.target.value)}
          placeholder="Physical description, personality traits, ideals, bonds, flaws"
          rows={4}
        />
      </section>

      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Notes</h2>
        <textarea
          className="character-sheet__textarea"
          value={notes ?? ""}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Anything you want to remember"
          rows={4}
        />
      </section>
    </>
  );
}

export default CharacterSheetStoryTab;

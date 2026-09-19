function CharacterSheetStoryTab({
  backstory,
  onBackstoryChange,
  appearance,
  onAppearanceChange,
  companion,
  onCompanionChange,
  notes,
  onNotesChange,
}) {
  return (
    <>
      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Backstory</h2>
        <textarea
          className="character-sheet__textarea"
          value={backstory ?? ""}
          onChange={(e) => onBackstoryChange(e.target.value)}
          placeholder="Where your character comes from, what drives them, key life events"
          rows={5}
        />
      </section>

      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Appearance &amp; Traits</h2>
        <textarea
          className="character-sheet__textarea"
          value={appearance ?? ""}
          onChange={(e) => onAppearanceChange(e.target.value)}
          placeholder="Physical description, personality traits, ideals, bonds, flaws"
          rows={4}
        />
      </section>

      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Companion</h2>
        <textarea
          className="character-sheet__textarea"
          value={companion ?? ""}
          onChange={(e) => onCompanionChange(e.target.value)}
          placeholder="Mount or companion - name, description, stats, anything you want to remember"
          rows={3}
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

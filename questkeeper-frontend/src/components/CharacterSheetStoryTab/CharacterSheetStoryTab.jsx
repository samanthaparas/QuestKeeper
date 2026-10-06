import PortraitUpload from "../PortraitUpload/PortraitUpload";
import { ABILITY_SCORES, ABILITY_LABELS } from "../../utils/characterSheet";

function CharacterSheetStoryTab({
  userId,
  characterId,
  name,
  details,
  onDetailChange,
  portraitUrl,
  onPortraitUpload,
  backstory,
  showBackstory,
  onBackstoryChange,
  onToggleBackstoryVisibility,
  appearance,
  onAppearanceChange,
  companion,
  onCompanionChange,
  companionMode,
  companionCreature,
  onToggleCompanionMode,
  onCompanionCreatureChange,
  onCompanionCreatureHpChange,
  onCompanionCreatureNotesChange,
  notes,
  onNotesChange,
}) {
  const isTrackingCreature = companionMode === "creature";

  const detailFields = [
    ["name", "Character name", name, ""],
    ["race", "Race", details.race, "e.g. Human, or your own"],
    ["class", "Class", details.className, "e.g. Artificer"],
    ["subclass", "Subclass", details.subclass, "Optional"],
    ["background", "Background", details.background, "e.g. Sage"],
  ];

  return (
    <>
      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Character Details</h2>
        <p className="character-sheet__empty-text">
          Type anything here, including homebrew or non-SRD options, so the
          sheet matches your paper one.
        </p>
        <div className="character-sheet__hero-row">
          {detailFields.map(([field, label, value, placeholder]) => (
            <label className="character-sheet__stat-box" key={field}>
              <span className="character-sheet__stat-label">{label}</span>
              <input
                type="text"
                className="character-sheet__stat-input"
                value={value ?? ""}
                placeholder={placeholder}
                onChange={(e) => onDetailChange(field, e.target.value)}
              />
            </label>
          ))}

          <label className="character-sheet__stat-box">
            <span className="character-sheet__stat-label">
              Spellcasting ability
            </span>
            <select
              className="character-sheet__stat-input"
              value={details.spellcastingAbility}
              onChange={(e) =>
                onDetailChange("spellcastingAbility", e.target.value)
              }
            >
              <option value="default">Class default</option>
              <option value="none">None</option>
              {ABILITY_SCORES.map((ability) => (
                <option key={ability} value={ability}>
                  {ABILITY_LABELS[ability]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Portrait</h2>
        <PortraitUpload
          userId={userId}
          characterId={characterId}
          name={name}
          portraitUrl={portraitUrl}
          onUpload={onPortraitUpload}
        />
      </section>

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
        <div className="character-sheet__section-header-row">
          <h2 className="character-sheet__section-title">Companion</h2>
          <button
            type="button"
            className="character-sheet__resource-remove"
            onClick={onToggleCompanionMode}
          >
            {isTrackingCreature ? "Switch to Freeform" : "Track as Creature"}
          </button>
        </div>

        {isTrackingCreature ? (
          <>
            <div className="character-sheet__hero-row">
              <div className="character-sheet__stat-box">
                <span className="character-sheet__stat-label">Name</span>
                <input
                  type="text"
                  className="character-sheet__stat-input"
                  value={companionCreature.name}
                  onChange={(e) =>
                    onCompanionCreatureChange("name", e.target.value)
                  }
                  placeholder="e.g. Victory"
                />
              </div>

              <div className="character-sheet__stat-box">
                <span className="character-sheet__stat-label">Armor Class</span>
                <input
                  type="number"
                  className="character-sheet__stat-input"
                  value={companionCreature.armorClass}
                  onChange={(e) =>
                    onCompanionCreatureChange("armorClass", e.target.value)
                  }
                  min={0}
                />
              </div>

              <div className="character-sheet__stat-box">
                <span className="character-sheet__stat-label">Speed</span>
                <span className="character-sheet__stat-value character-sheet__hp-value">
                  <input
                    type="number"
                    className="character-sheet__hp-input"
                    value={companionCreature.speed}
                    onChange={(e) =>
                      onCompanionCreatureChange("speed", e.target.value)
                    }
                    min={0}
                  />
                  {" ft"}
                </span>
              </div>

              <div className="character-sheet__stat-box character-sheet__stat-box--featured">
                <span className="character-sheet__stat-label">Hit Points</span>
                <span className="character-sheet__stat-value character-sheet__hp-value">
                  <input
                    type="number"
                    className="character-sheet__hp-input"
                    value={companionCreature.hitPoints.current}
                    onChange={(e) =>
                      onCompanionCreatureHpChange("current", e.target.value)
                    }
                    min={0}
                    max={companionCreature.hitPoints.max}
                  />
                  {" / "}
                  <input
                    type="number"
                    className="character-sheet__hp-input"
                    value={companionCreature.hitPoints.max}
                    onChange={(e) =>
                      onCompanionCreatureHpChange("max", e.target.value)
                    }
                    min={0}
                  />
                </span>
              </div>
            </div>

            <textarea
              className="character-sheet__textarea"
              value={companionCreature.notes}
              onChange={(e) => onCompanionCreatureNotesChange(e.target.value)}
              placeholder="Abilities, equipment worn (e.g. barding and its AC bonus), personality, anything to remember"
              rows={3}
            />
          </>
        ) : (
          <textarea
            className="character-sheet__textarea"
            value={companion ?? ""}
            onChange={(e) => onCompanionChange(e.target.value)}
            placeholder="Mount or companion - name, description, stats, anything you want to remember"
            rows={3}
          />
        )}
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

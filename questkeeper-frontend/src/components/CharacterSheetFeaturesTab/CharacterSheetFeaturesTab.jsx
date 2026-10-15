import { useEffect, useMemo, useState } from "react";
import EditableItemList from "../EditableItemList/EditableItemList";
import SrdDetailDialog from "../SrdDetailDialog/SrdDetailDialog";
import { useSrdDetailView } from "../../hooks/useSrdDetailView";
import {
  getFeats,
  getFeatDetails,
  getClassFeatures,
  getSubclassFeatures,
  getRaceTraits,
  getSubraceTraits,
  getFeatureDetails,
  getTraitDetails,
} from "../../utils/api";
import {
  findSrdMatches,
  preferEdition,
  formatFeatDetails,
  createSrdNameLookup,
  tagWithSource,
  formatClassFeatureDetails,
  formatTraitDetails,
  loadFeatureEntries,
  buildFeatureChoices,
} from "../../utils/srdDetails";
import Button from "../Button/Button";
import { findStraySubclassFeatures, sourceFromEntry } from "../../utils/featureSources";

function loadFeatureDetails(match) {
  return match.source === "trait"
    ? getTraitDetails(match.index).then(formatTraitDetails)
    : getFeatureDetails(match.index).then(formatClassFeatureDetails);
}

function CharacterSheetFeaturesTab({
  classId,
  subclassId,
  subclassName = null,
  raceId,
  subraceId,
  level = 1,
  features,
  onFeaturesAddMany,
  onFeaturesRemoveMany = () => {},
  onFeatureAdd,
  onFeatureUpdate,
  onFeatureRemove,
  feats,
  onFeatAdd,
  onFeatUpdate,
  onFeatRemove,
  proficiencies,
  onProficiencyAdd,
  onProficiencyUpdate,
  onProficiencyRemove,
  languages,
  onLanguagesChange,
  size,
  onSizeChange,
}) {
  const [allFeats, setAllFeats] = useState([]);
  const [characterFeatures, setCharacterFeatures] = useState([]);
  const detailView = useSrdDetailView();
  const [showImport, setShowImport] = useState(false);
  const [importState, setImportState] = useState({
    status: "idle",
    choices: [],
  });
  const [picked, setPicked] = useState(() => new Set());
  // Every SRD feature for this race and class (including other subclasses'),
  // used to spot features that belong to a subclass the character doesn't have.
  const [allEntries, setAllEntries] = useState([]);
  const [strayPicked, setStrayPicked] = useState(null);

  useEffect(() => {
    if (!classId) return undefined;
    let ignore = false;
    loadFeatureEntries({ classId, subclassId, raceId, subraceId })
      .then((entries) => !ignore && setAllEntries(entries))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [classId, subclassId, raceId, subraceId]);

  const strays = useMemo(
    () => findStraySubclassFeatures(features, allEntries, subclassId ?? null),
    [features, allEntries, subclassId],
  );
  // Ticked to remove: everything listed, until the player unticks some.
  const strayChecked = strayPicked ?? new Set(strays.map(({ feature }) => feature.index));

  function removeStrays() {
    const ids = strays
      .map(({ feature }) => feature.index)
      .filter((id) => strayChecked.has(id));
    if (ids.length === 0) return;
    if (window.confirm(`Remove ${ids.length} ${ids.length === 1 ? "feature" : "features"}? This can't be undone.`)) {
      onFeaturesRemoveMany(ids);
      setStrayPicked(null);
    }
  }

  useEffect(() => {
    Promise.allSettled([getFeats("2014"), getFeats("2024")]).then((results) =>
      setAllFeats(
        results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      ),
    );
  }, []);

  useEffect(() => {
    let ignore = false;

    const requests = [
      classId && getClassFeatures(classId).then(tagWithSource("feature")),
      subclassId &&
        getSubclassFeatures(subclassId).then(tagWithSource("feature")),
      raceId && getRaceTraits(raceId).then(tagWithSource("trait")),
      subraceId && getSubraceTraits(subraceId).then(tagWithSource("trait")),
    ].filter(Boolean);

    Promise.allSettled(requests).then((results) => {
      if (ignore) return;
      setCharacterFeatures(
        results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        ),
      );
    });

    return () => {
      ignore = true;
    };
  }, [classId, subclassId, raceId, subraceId]);

  const findFeatureMatches = useMemo(
    () => createSrdNameLookup(characterFeatures),
    [characterFeatures],
  );

  function openFeatureDetails(feature) {
    const [match] = findFeatureMatches(feature.name);
    detailView.open(match.name, () =>
      loadFeatureDetails(match).then((details) => [details]),
    );
  }

  function getFeatMatches(feat) {
    return preferEdition(findSrdMatches(feat.name, allFeats), feat.edition);
  }

  // Looks up what the SRD gives this race and class, ticks everything the
  // character has reached, and lets the player add the rest or skip some.
  function toggleImport() {
    if (showImport) {
      setShowImport(false);
      return;
    }

    setShowImport(true);
    setImportState({ status: "loading", choices: [] });

    loadFeatureEntries({ classId, subclassId, raceId, subraceId })
      .then((entries) => {
        const choices = buildFeatureChoices(
          entries,
          level,
          features.map((feature) => feature.name),
        );
        setPicked(
          new Set(choices.filter((c) => c.defaultSelected).map((c) => c.key)),
        );
        setImportState({ status: "ready", choices });
      })
      .catch(() => setImportState({ status: "error", choices: [] }));
  }

  function togglePicked(key) {
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addPicked() {
    const chosen = importState.choices.filter((choice) =>
      picked.has(choice.key),
    );
    if (chosen.length === 0) return;

    onFeaturesAddMany(
      chosen.map((choice) => ({
        name: choice.name,
        description: choice.description,
        // Remembered on the sheet, so a later subclass change can tidy up safely.
        source: sourceFromEntry(choice),
      })),
    );
    setShowImport(false);
  }

  function openFeatDetails(feat) {
    const matches = getFeatMatches(feat);
    detailView.open(matches[0].name, () =>
      Promise.all(
        matches.map((match) =>
          getFeatDetails(match.index, match.edition).then(formatFeatDetails),
        ),
      ),
    );
  }

  return (
    <>
      <section className="character-sheet__section">
        {/* Features from a subclass the character doesn't have (an old bug
            added Draconic Bloodline's to every Sorcerer). Nothing is removed
            until the player ticks and confirms. */}
        {strays.length > 0 && (
          <div className="character-sheet__stray-features" role="status">
            <p className="character-sheet__stray-title">
              {strays.length === 1 ? "1 feature belongs" : `${strays.length} features belong`} to a
              different subclass{subclassName ? ` than ${subclassName}` : ""}.
            </p>
            <p className="character-sheet__empty-text">
              Untick any you want to keep, then remove the rest. Features you typed
              yourself are only listed if their name exactly matches another
              subclass&apos;s feature.
            </p>
            <ul className="character-sheet__feature-import-list">
              {strays.map(({ feature, from, guessed }) => (
                <li key={feature.index}>
                  <label>
                    <input
                      type="checkbox"
                      checked={strayChecked.has(feature.index)}
                      onChange={() => {
                        const next = new Set(strayChecked);
                        if (next.has(feature.index)) next.delete(feature.index);
                        else next.add(feature.index);
                        setStrayPicked(next);
                      }}
                    />
                    <span>
                      <strong>{feature.name}</strong>{" "}
                      <span className="character-sheet__feature-import-meta">
                        from {from}
                        {guessed ? " (matched by name)" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <Button variant="secondary" type="button" onClick={removeStrays}>
              Remove ticked features
            </Button>
          </div>
        )}

        <div className="character-sheet__feature-import">
          <Button
            variant="secondary"
            type="button"
            aria-expanded={showImport}
            onClick={toggleImport}
          >
            {showImport ? "Close" : "Add from my class and race"}
          </Button>

          {showImport && (
            <div className="character-sheet__feature-import-panel">
              {importState.status === "loading" && (
                <p className="character-sheet__empty-text">
                  Looking up your features...
                </p>
              )}
              {importState.status === "error" && (
                <p className="character-sheet__empty-text">
                  Couldn't load features right now. Try again in a moment.
                </p>
              )}
              {importState.status === "ready" &&
                importState.choices.length === 0 && (
                  <p className="character-sheet__empty-text">
                    No features found for this race and class. Homebrew? Use Add
                    Feature below to type your own.
                  </p>
                )}
              {importState.status === "ready" &&
                importState.choices.length > 0 && (
                  <>
                    <p className="character-sheet__empty-text">
                      Features up to level {level} are ticked. Untick any you
                      don't want, then add them. You can edit or remove them
                      afterward.
                    </p>
                    <ul className="character-sheet__feature-import-list">
                      {importState.choices.map((choice) => (
                        <li key={choice.key}>
                          <label>
                            <input
                              type="checkbox"
                              checked={picked.has(choice.key)}
                              disabled={choice.alreadyAdded}
                              onChange={() => togglePicked(choice.key)}
                            />
                            <span>
                              <strong>{choice.name}</strong>{" "}
                              <span className="character-sheet__feature-import-meta">
                                {choice.sourceLabel}
                                {choice.level ? ` · level ${choice.level}` : ""}
                                {choice.optionOf ? ` · pick one for ${choice.optionOf}` : ""}
                                {choice.alreadyAdded
                                  ? " · already on your sheet"
                                  : ""}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <Button
                      type="button"
                      onClick={addPicked}
                      disabled={picked.size === 0}
                    >
                      {`Add ${picked.size} ${picked.size === 1 ? "feature" : "features"}`}
                    </Button>
                  </>
                )}
            </div>
          )}
        </div>

        <EditableItemList
          title="Features"
          items={features}
          getItemId={(item) => item.index}
          fields={[
            {
              key: "name",
              type: "text",
              placeholder: "Feature name (e.g. Aura of Protection)",
            },
            {
              key: "description",
              type: "textarea",
              placeholder: "Description (optional) - one line per bullet point",
            },
          ]}
          emptyText='Your race and class give you special abilities, like Darkvision or Second Wind. Tap "Add from my class and race" above to fill them in, or Add Feature to type your own.'
          addButtonLabel="Add Feature"
          onAdd={onFeatureAdd}
          onUpdate={onFeatureUpdate}
          onRemove={onFeatureRemove}
          isNameClickable={(feature) =>
            findFeatureMatches(feature.name).length > 0
          }
          onNameClick={openFeatureDetails}
        />
      </section>

      <section className="character-sheet__section">
        <EditableItemList
          title="Feats"
          items={feats}
          getItemId={(item) => item.index}
          fields={[
            {
              key: "name",
              type: "text",
              placeholder: "Feat name (e.g. Shield Master)",
            },
            {
              key: "description",
              type: "textarea",
              placeholder: "Description (optional) - one line per bullet point",
            },
          ]}
          emptyText="Feats are optional extra abilities. Most characters don't get one until level 4, when they can take a feat instead of raising an ability score, so it's fine for this to be empty."
          addButtonLabel="Add Feat"
          onAdd={onFeatAdd}
          onUpdate={onFeatUpdate}
          onRemove={onFeatRemove}
          isNameClickable={(feat) => getFeatMatches(feat).length > 0}
          onNameClick={openFeatDetails}
        />
      </section>

      <section className="character-sheet__section">
        <EditableItemList
          title="Proficiencies"
          items={proficiencies}
          getItemId={(item) => item.index}
          fields={[
            {
              key: "name",
              type: "text",
              placeholder: "Proficiency (e.g. Longswords, Heavy Armor)",
            },
            {
              key: "description",
              type: "textarea",
              placeholder: "Notes (optional) - one line per bullet point",
            },
          ]}
          emptyText="The weapons, armor and tools your character is trained with, like Simple Weapons or Light Armor. Your class and background list them. Tap Add Proficiency to record each one."
          addButtonLabel="Add Proficiency"
          onAdd={onProficiencyAdd}
          onUpdate={onProficiencyUpdate}
          onRemove={onProficiencyRemove}
        />
      </section>

      <section className="character-sheet__section">
        <h2 className="character-sheet__section-title">Languages &amp; Size</h2>
        <label className="character-sheet__field">
          <span className="character-sheet__stat-label">Languages</span>
          <textarea
            className="character-sheet__textarea"
            value={languages}
            onChange={(e) => onLanguagesChange(e.target.value)}
            placeholder={"Common\nInfernal"}
            rows={2}
          />
        </label>
        <label className="character-sheet__field">
          <span className="character-sheet__stat-label">Size</span>
          <select
            className="character-sheet__stat-input character-sheet__size-select"
            value={size}
            onChange={(e) => onSizeChange(e.target.value)}
          >
            <option value="Tiny">Tiny</option>
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
            <option value="Huge">Huge</option>
            <option value="Gargantuan">Gargantuan</option>
          </select>
        </label>
      </section>

      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </>
  );
}

export default CharacterSheetFeaturesTab;

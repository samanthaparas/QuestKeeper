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

function loadFeatureDetails(match) {
  return match.source === "trait"
    ? getTraitDetails(match.index).then(formatTraitDetails)
    : getFeatureDetails(match.index).then(formatClassFeatureDetails);
}

function CharacterSheetFeaturesTab({
  classId,
  subclassId,
  raceId,
  subraceId,
  level = 1,
  features,
  onFeaturesAddMany,
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
          emptyText="No class or racial features recorded yet."
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
          emptyText="No feats yet."
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
          emptyText="No weapon, armor, or tool proficiencies recorded yet."
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

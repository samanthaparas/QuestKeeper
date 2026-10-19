import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  getBackgroundDetails,
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
  descriptionFromSrd,
  normalizeItemName,
} from "../../utils/srdDetails";
import Button from "../Button/Button";
import { getGrantDamage, getGrantRollDice, getSafeSpellLink } from "../../utils/characterSheet";
import { featureDamageAt } from "../../utils/homebrewMappers";
import RollButton from "../RollDock/RollButton";
import { findStraySubclassFeatures, sourceFromEntry } from "../../utils/featureSources";
import {
  choicesFor,
  describePicks,
  formatOption,
  missingPicks,
  pickChoice,
} from "../../utils/featureChoices";

// --- Sort and Show for the three lists ---------------------------------------

const NAME_SORT = { key: "name", label: "Name (A–Z)", compare: () => 0 };
const ADDED_SORT = { key: "added", label: "Order added" };

// Where a feature came from, for grouping. Features added before sources
// were saved (or typed by hand) are "Other".
const ORIGIN_ORDER = ["Class", "Subclass", "Tasha's option", "Race", "Background", "Feat", "Other"];
function featureOrigin(feature, optionNames) {
  const type = feature.source?.type;
  if (type === "class") return "Class";
  if (type === "subclass") return "Subclass";
  if (type === "race" || type === "subrace") return "Race";
  if (type === "background") return "Background";
  if (type === "feat") return "Feat";
  if (optionNames.has(String(feature.name ?? "").toLowerCase())) return "Tasha's option";
  return "Other";
}

// A proficiency's kind, guessed from its name ("Light Armor", "Thieves'
// Tools", "Longswords"), so the list can be grouped or filtered.
const PROFICIENCY_KINDS = ["Armor", "Weapons", "Tools", "Saving throws", "Skills", "Other"];
function proficiencyKind(item) {
  const name = String(item.name ?? "").toLowerCase();
  if (/saving throw/.test(name)) return "Saving throws";
  if (/^skill/.test(name)) return "Skills";
  if (/armor|shield/.test(name)) return "Armor";
  if (/tools?\b|kit\b|supplies|instrument|set\b|utensils|vehicles?/.test(name)) return "Tools";
  if (/weapon|sword|bow|axe|dagger|mace|hammer|spear|staff|club|dart|sling|whip|pike|halberd|lance|trident|flail|scimitar|rapier|javelin|net|glaive|maul|morningstar|sickle|quarterstaff|crossbow/.test(name)) {
    return "Weapons";
  }
  return "Other";
}
const byKind = (kinds, kindOf) => (a, b) => kinds.indexOf(kindOf(a)) - kinds.indexOf(kindOf(b));

const PROFICIENCY_SORTS = [
  ADDED_SORT,
  NAME_SORT,
  { key: "kind", label: "Kind", compare: byKind(PROFICIENCY_KINDS, proficiencyKind), groupOf: proficiencyKind },
];
const PROFICIENCY_FILTERS = PROFICIENCY_KINDS.map((kind) => ({
  key: `kind:${kind}`,
  label: kind,
  match: (item) => proficiencyKind(item) === kind,
}));

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
  onFeatureChoose = () => {},
  // Tasha's optional class features for this class, which are on, and
  // whether a feature is one an option replaces.
  optionalFeatures = [],
  optionalFeaturesOn = {},
  onOptionalFeatureSwitch = () => {},
  isReplacedFeature = () => false,
  // How many options are new to look at (a red dot), and what to call when
  // the player opens the list (marks them seen).
  newOptionalCount = 0,
  onOptionalFeaturesSeen = () => {},
  // For a feature's own tap-to-roll (Tireless: 1d8 + Wisdom).
  abilityScores = {},
  // Homebrew subclass features with extra damage by level (Dreadful
  // Strikes), from the player's homebrew list.
  homebrewFeatureDamage = [],
  background = null,
  // From the sheet page, which loads them once (the tab loads its own if not).
  featureEntries = null,
  setupTasks = [],
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
  const [ownEntries, setOwnEntries] = useState([]);
  const allEntries = featureEntries ?? ownEntries;
  const [strayPicked, setStrayPicked] = useState(null);

  useEffect(() => {
    if (!classId || featureEntries) return undefined;
    let ignore = false;
    loadFeatureEntries({ classId, subclassId, raceId, subraceId })
      .then((entries) => !ignore && setOwnEntries(entries))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [classId, subclassId, raceId, subraceId, featureEntries]);

  // The background's feature (Charlatan: False Identity), for characters
  // made before creation added it. Offered with a button, never added alone.
  const [backgroundFeature, setBackgroundFeature] = useState(null);
  const backgroundFeatureName = background?.feature ?? null;
  const hasBackgroundFeature = features.some(
    (feature) => normalizeItemName(feature.name) === normalizeItemName(backgroundFeatureName ?? ""),
  );

  useEffect(() => {
    if (!background?.id || !backgroundFeatureName || hasBackgroundFeature) return undefined;
    let ignore = false;
    getBackgroundDetails(background.id)
      .then((raw) => {
        if (ignore || !raw?.feature?.name) return;
        setBackgroundFeature({
          name: raw.feature.name,
          description: descriptionFromSrd(raw.feature.desc),
          source: { type: "background", id: background.id, key: `background:${background.id}`, level: null },
        });
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [background?.id, backgroundFeatureName, hasBackgroundFeature]);

  const strays = useMemo(
    () => findStraySubclassFeatures(features, allEntries, subclassId ?? null),
    [features, allEntries, subclassId],
  );
  // Ticked to remove: everything listed, until the player unticks some.
  const strayChecked = strayPicked ?? new Set(strays.map(({ feature }) => feature.index));

  // Features: by name, by the level they come at, or by where they came
  // from; show one origin, or just the ones with a pick still to make.
  const optionNames = new Set(
    optionalFeatures.flatMap((option) => option.grants ?? []).map((grant) => grant.name.toLowerCase()),
  );
  const originOf = (feature) => featureOrigin(feature, optionNames);
  const levelOf = (feature) => Number(feature.source?.level) || 99;
  const featureSorts = [
    ADDED_SORT,
    NAME_SORT,
    { key: "level", label: "Level gained", compare: (a, b) => levelOf(a) - levelOf(b) },
    { key: "origin", label: "Where it's from", compare: byKind(ORIGIN_ORDER, originOf), groupOf: originOf },
  ];
  const featureFilters = [
    ...ORIGIN_ORDER.map((origin) => ({
      key: `origin:${origin}`,
      label: origin,
      match: (feature) => originOf(feature) === origin,
    })),
    {
      key: "todo",
      label: "Picks still to make",
      match: (feature) =>
        choicesFor(feature, allEntries).some((choice) => (choice.picked?.filter(Boolean).length ?? 0) < choice.choose),
    },
  ];

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
        // Features an optional one replaces (Favored Enemy under Favored
        // Foe) aren't offered.
        const choices = buildFeatureChoices(
          entries,
          level,
          features.map((feature) => feature.name),
        ).filter((choice) => !isReplacedFeature(choice.name));
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
        // Picks it asks for (Favored Enemy: a creature type), made below.
        choices: choice.choices ?? [],
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
        {/* What's left to set up (a language, Favored Enemy...). Nothing
            here is required to use the sheet. */}
        {setupTasks.length > 0 && (
          <div className="character-sheet__setup" role="status">
            <p className="character-sheet__stray-title">
              Character setup: {setupTasks.length}{" "}
              {setupTasks.length === 1 ? "choice" : "choices"} left
            </p>
            <ul className="character-sheet__setup-list">
              {setupTasks.map((task) => (
                <li key={task.key}>
                  {task.label}
                  {task.to && (
                    <>
                      {" "}
                      <Link to={task.to}>{task.linkLabel ?? "Open"}</Link>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

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

        {backgroundFeature && !hasBackgroundFeature && (
          <div className="character-sheet__stray-features" role="status">
            <p className="character-sheet__stray-title">
              Your background ({background.name}) gives you {backgroundFeature.name}.
            </p>
            <Button
              variant="secondary"
              type="button"
              onClick={() => onFeaturesAddMany([backgroundFeature])}
            >
              Add {backgroundFeature.name}
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

          {/* Tasha's optional class features: each one is the player's (or
              table's) choice, and nothing changes until they confirm. */}
          {/* Folded to one small line beside the button, so it doesn't take
              up the tab once decided; it says how many are in use, and a tap
              opens it onto its own full-width row. */}
          {optionalFeatures.length > 0 && (
            <details
              className="character-sheet__optional-features"
              // Opening it counts as having looked, switched or not.
              onToggle={(event) => {
                if (event.currentTarget.open && newOptionalCount > 0) onOptionalFeaturesSeen();
              }}
            >
              <summary className="character-sheet__optional-features-toggle">
                Optional class features (Tasha&apos;s) ·{" "}
                {(() => {
                  const inUse = optionalFeatures.filter((option) => optionalFeaturesOn[option.key]).length;
                  return inUse > 0 ? `${inUse} in use` : "not using any";
                })()}
                {newOptionalCount > 0 && (
                  <span
                    className="character-sheet__new-dot"
                    role="img"
                    aria-label={`${newOptionalCount} new to look at`}
                    title="New: an option you can use now. Open to have a look."
                  />
                )}
              </summary>
              <p className="character-sheet__empty-text">
                Some tables swap these in for the original features. Ask your DM.
                QuestKeeper keeps the names and numbers; the full text is in the book.
              </p>
              <ul className="character-sheet__setup-list">
                {optionalFeatures.map((option) => {
                  const isOn = Boolean(optionalFeaturesOn[option.key]);
                  return (
                    <li key={option.key}>
                      <strong>{option.name}</strong>{" "}
                      {isOn ? `(in use, instead of ${option.replaces})` : `instead of ${option.replaces}`}{" "}
                      <a href={option.link} target="_blank" rel="noopener noreferrer">
                        Read it
                      </a>{" "}
                      <Button
                        variant="secondary"
                        type="button"
                        onClick={() => onOptionalFeatureSwitch(option.key, !isOn)}
                      >
                        {isOn ? `Stop using ${option.name}` : `Use ${option.name}`}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

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
          // The pencil and trash wait behind "Edit features", so rows stay calm in play.
          hasEditToggle
          editToggleLabel="Edit features"
          isNameClickable={(feature) =>
            findFeatureMatches(feature.name).length > 0
          }
          onNameClick={openFeatureDetails}
          viewKey="features"
          sortOptions={featureSorts}
          filterOptions={featureFilters}
          // "Favored Enemy (1 type): Undead" once the pick is made.
          formatPrimaryLabel={(feature) => {
            const picks = describePicks(choicesFor(feature, allEntries));
            return picks ? `${feature.name}: ${picks}` : feature.name;
          }}
          extraRowContent={(feature) => {
            const choices = choicesFor(feature, allEntries);
            // A book option picked on level-up links to where it's written up.
            const link = getSafeSpellLink(feature.link);
            // An optional feature's numbers at this level (Favored Foe: 1d6).
            const grant = optionalFeatures
              .flatMap((option) => option.grants)
              .find((item) => item.name.toLowerCase() === String(feature.name).toLowerCase());
            const damage = getGrantDamage(grant, level);
            // A homebrew feature's damage at this level (Dreadful Strikes:
            // 1d6 psychic at 11), with its own roll. It's a separate roll
            // on purpose: the player adds it when it applies.
            const homebrew = homebrewFeatureDamage.find(
              (item) => item.name.toLowerCase() === String(feature.name).toLowerCase(),
            );
            const homebrewDamage = featureDamageAt(homebrew, level);
            const grantNote = [
              damage ? `Extra damage: ${damage}` : "",
              grant?.note ?? "",
              homebrewDamage
                ? `Extra damage: ${homebrewDamage.dice}${homebrewDamage.type ? ` ${homebrewDamage.type}` : ""}`
                : "",
              homebrewDamage ? (homebrew.damageNote ?? "") : "",
            ]
              .filter(Boolean)
              .join(" · ");
            // Tireless: roll its temporary HP with this character's Wisdom.
            const rollDice = getGrantRollDice(grant, abilityScores);
            if (choices.length === 0 && !link && !grantNote) return null;
            return (
              <span className="character-sheet__feature-choices">
                {grantNote && <span className="character-sheet__feature-choice-note">{grantNote}</span>}
                {homebrewDamage && (
                  <RollButton
                    label={`${feature.name} damage${homebrewDamage.type ? ` (${homebrewDamage.type})` : ""}`}
                    damage={homebrewDamage.dice}
                    className="character-sheet__feature-roll"
                  >
                    🎲 {homebrewDamage.dice}
                  </RollButton>
                )}
                {rollDice && (
                  <RollButton
                    label={grant.roll.label}
                    damage={rollDice}
                    className="character-sheet__feature-roll"
                  >
                    🎲 {rollDice}
                  </RollButton>
                )}
                {link && (
                  <a
                    className="character-sheet__spell-link"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Book link
                  </a>
                )}
                {choices.flatMap((choice) =>
                  Array.from({ length: choice.choose }, (_, slot) => (
                    <label key={`${choice.key}-${slot}`} className="character-sheet__feature-choice">
                      <span className="character-sheet__visually-hidden">
                        {choice.label} for {feature.name}
                      </span>
                      <select
                        value={choice.picked?.[slot] ?? ""}
                        className={choice.picked?.[slot] ? "" : "character-sheet__feature-choice--empty"}
                        onChange={(event) =>
                          onFeatureChoose(
                            feature.index,
                            pickChoice(choices, choice.key, slot, event.target.value),
                          )
                        }
                      >
                        <option value="">Choose {choice.label.toLowerCase()}…</option>
                        {choice.options.map((option) => (
                          <option key={option} value={option}>
                            {formatOption(option)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )),
                )}
                {missingPicks(choices) > 0 && (
                  <span className="character-sheet__feature-choice-note">Not chosen yet</span>
                )}
              </span>
            );
          }}
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
          // The pencil and trash wait behind "Edit feats", so rows stay calm in play.
          hasEditToggle
          editToggleLabel="Edit feats"
          isNameClickable={(feat) => getFeatMatches(feat).length > 0}
          onNameClick={openFeatDetails}
          viewKey="feats"
          sortOptions={[ADDED_SORT, NAME_SORT]}
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
          // The pencil and trash wait behind "Edit proficiencies", so rows stay calm in play.
          hasEditToggle
          editToggleLabel="Edit proficiencies"
          viewKey="proficiencies"
          sortOptions={PROFICIENCY_SORTS}
          filterOptions={PROFICIENCY_FILTERS}
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

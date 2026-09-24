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
} from "../../utils/srdDetails";

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
  features,
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
}) {
  const [allFeats, setAllFeats] = useState([]);
  const [characterFeatures, setCharacterFeatures] = useState([]);
  const detailView = useSrdDetailView();

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

      <SrdDetailDialog view={detailView.view} onClose={detailView.close} />
    </>
  );
}

export default CharacterSheetFeaturesTab;

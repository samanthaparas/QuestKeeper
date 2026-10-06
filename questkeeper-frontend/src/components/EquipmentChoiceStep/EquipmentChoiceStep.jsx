import { useEffect, useState } from "react";
import Button from "../Button/Button";
import { getEquipmentCategory } from "../../utils/api";
import {
  categoriesNeeded,
  defaultEquipmentSelections,
  describeOption,
  describePick,
  isEquipmentComplete,
  resolveChosenEquipment,
  selectionFor,
} from "../../utils/equipmentChoices";
import "./EquipmentChoiceStep.css";

function describeGear(items) {
  return items
    .map(({ name, quantity }) => (quantity > 1 ? `${name} ×${quantity}` : name))
    .join(", ");
}

// The creation step for starting gear: each class (and some backgrounds) offers
// a few either/or choices, and some options are "any martial weapon" style
// picks from a list. The chosen armor sets the new character's AC and chosen
// weapons become attacks, just like the gear they always get.
function EquipmentChoiceStep({
  groups,
  sourceNames,
  fixedGear = [],
  initialSelections,
  onNext,
  onBack,
}) {
  const [selections, setSelections] = useState(
    () => initialSelections ?? defaultEquipmentSelections(groups),
  );
  const [categoryItems, setCategoryItems] = useState({});
  const [loadError, setLoadError] = useState(false);
  const neededKey = categoriesNeeded(groups).join(",");

  useEffect(() => {
    if (!neededKey) return undefined;
    let cancelled = false;

    Promise.all(
      neededKey
        .split(",")
        .map((index) =>
          getEquipmentCategory(index).then((category) => [
            index,
            category.equipment,
          ]),
        ),
    )
      .then((entries) => {
        if (!cancelled) setCategoryItems(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [neededKey]);

  const isComplete = isEquipmentComplete(groups, selections);
  // If the lists can't load, the player can still go on; anything left
  // unpicked can be added later on the sheet's Inventory tab.
  const canContinue = isComplete || loadError;

  function chooseOption(group, option) {
    setSelections((prev) =>
      prev[group.id]?.optionId === option.id
        ? prev
        : { ...prev, [group.id]: selectionFor(option) },
    );
  }

  function choosePick(group, pick, slot, itemIndex) {
    setSelections((prev) => {
      const current = prev[group.id];
      const picked = [...(current.picks[pick.id] ?? [])];
      picked[slot] = itemIndex || null;
      return {
        ...prev,
        [group.id]: {
          ...current,
          picks: { ...current.picks, [pick.id]: picked },
        },
      };
    });
  }

  function handleNext() {
    onNext(
      selections,
      resolveChosenEquipment(groups, selections, categoryItems),
    );
  }

  function renderPicks(group, option) {
    return option.picks.map((pick) => {
      const items = categoryItems[pick.category.index];
      return (
        <div className="equipment-step__picks" key={pick.id}>
          {Array.from({ length: pick.count }, (_, slot) => (
            <select
              key={slot}
              className="equipment-step__select"
              aria-label={`${describePick(pick)}${pick.count > 1 ? ` (${slot + 1} of ${pick.count})` : ""}`}
              value={selections[group.id]?.picks?.[pick.id]?.[slot] ?? ""}
              disabled={!items}
              onChange={(event) =>
                choosePick(group, pick, slot, event.target.value)
              }
            >
              <option value="">
                {items
                  ? `Choose ${pick.count > 1 ? `#${slot + 1}` : "one"} from ${pick.category.name}`
                  : loadError
                    ? "Couldn't load the list"
                    : "Loading..."}
              </option>
              {(items ?? []).map((item) => (
                <option key={item.index} value={item.index}>
                  {item.name}
                </option>
              ))}
            </select>
          ))}
        </div>
      );
    });
  }

  return (
    <div className="equipment-step">
      <h2 className="equipment-step__title">Choose Your Starting Gear</h2>
      <p className="equipment-step__description">
        Armor you pick sets your Armor Class, and weapons become attacks on your
        sheet. Not sure? The first option in each choice is the classic pick.
      </p>

      {fixedGear.length > 0 && (
        <p className="equipment-step__fixed">
          <strong>You also start with:</strong> {describeGear(fixedGear)}
        </p>
      )}

      {loadError && (
        <p className="equipment-step__warning" role="alert">
          Couldn&apos;t load some item lists. You can go on and add those items
          later on your sheet&apos;s Inventory tab.
        </p>
      )}

      <div className="equipment-step__groups">
        {groups.map((group, groupIndex) => {
          const sourceName = sourceNames[group.source] ?? group.source;
          const selected = selections[group.id];
          const single = group.options.length === 1;

          return (
            <fieldset className="equipment-step__group" key={group.id}>
              <legend className="equipment-step__legend">
                {single
                  ? `${sourceName}: ${describeOption(group.options[0])}`
                  : `${sourceName}: choice ${groupIndex + 1}`}
              </legend>

              {single
                ? renderPicks(group, group.options[0])
                : group.options.map((option, optionIndex) => {
                    const isChosen = selected?.optionId === option.id;
                    return (
                      <div
                        className={`equipment-step__option${isChosen ? " equipment-step__option--chosen" : ""}`}
                        key={option.id}
                      >
                        <label className="equipment-step__option-label">
                          <input
                            type="radio"
                            name={group.id}
                            checked={isChosen}
                            onChange={() => chooseOption(group, option)}
                          />
                          <span>
                            <span className="equipment-step__letter">
                              ({"abcdef"[optionIndex]})
                            </span>{" "}
                            {describeOption(option)}
                            {option.requires && (
                              <span className="equipment-step__note">
                                Only if you&apos;re trained with{" "}
                                {option.requires}. Check your class and subclass
                                proficiencies.
                              </span>
                            )}
                          </span>
                        </label>
                        {isChosen && renderPicks(group, option)}
                      </div>
                    );
                  })}
            </fieldset>
          );
        })}
      </div>

      <div className="equipment-step__nav">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!canContinue} onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

export default EquipmentChoiceStep;

import { useState, useEffect } from "react";
import { getTraitDetails } from "../../utils/api";
import "./SubraceCantripStep.css";

function SubraceCantripStep({
  subrace,
  traitId,
  initialSelected,
  onNext,
  onBack,
}) {
  const [options, setOptions] = useState([]);
  const [maxChoices, setMaxChoices] = useState(1);
  const [isLoading, setIsLoading] = useState(Boolean(traitId));
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState(() => initialSelected ?? []);

  useEffect(() => {
    if (!traitId) return;

    getTraitDetails(traitId)
      .then((data) => {
        const spellOptions = data.trait_specific?.spell_options;
        setOptions(
          (spellOptions?.from?.options ?? []).map((option) => option.item),
        );
        setMaxChoices(spellOptions?.choose ?? 1);
      })
      .catch(() =>
        setError("Unable to load cantrip options. Please try again later."),
      )
      .finally(() => setIsLoading(false));
  }, [traitId]);

  const isComplete = chosen.length === maxChoices;

  function toggleChoice(index) {
    setChosen((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= maxChoices) return prev;
      return [...prev, index];
    });
  }

  function handleNext() {
    const selected = options.filter((option) => chosen.includes(option.index));
    onNext(selected);
  }

  return (
    <div className="subrace-cantrip-step">
      <h2 className="subrace-cantrip-step__title">Choose a Free Cantrip</h2>

      {!traitId && (
        <p className="subrace-cantrip-step__description">
          {subrace?.name ?? "This race"} doesn't grant a free cantrip.
        </p>
      )}

      {traitId && isLoading && (
        <p className="subrace-cantrip-step__description">
          Loading cantrip options...
        </p>
      )}

      {traitId && error && (
        <p className="subrace-cantrip-step__error">{error}</p>
      )}

      {traitId && !isLoading && !error && (
        <>
          <p className="subrace-cantrip-step__description">
            {subrace?.name}'s Cantrip trait lets you learn one cantrip from the
            wizard spell list. Choose {maxChoices} ({chosen.length}/{maxChoices}
            ):
          </p>

          <div className="subrace-cantrip-step__checklist">
            {options.map((option) => (
              <label
                className="subrace-cantrip-step__checkbox"
                key={option.index}
              >
                <input
                  type="checkbox"
                  checked={chosen.includes(option.index)}
                  disabled={
                    !chosen.includes(option.index) &&
                    chosen.length >= maxChoices
                  }
                  onChange={() => toggleChoice(option.index)}
                />
                {option.name}
              </label>
            ))}
          </div>
        </>
      )}

      <div className="subrace-cantrip-step__nav">
        <button
          className="subrace-cantrip-step__back-button"
          type="button"
          onClick={onBack}
        >
          Back
        </button>

        <button
          className="subrace-cantrip-step__next-button"
          type="button"
          disabled={traitId ? !isComplete : false}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default SubraceCantripStep;

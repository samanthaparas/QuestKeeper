import { useId, useState } from "react";
import { CATEGORY_LABELS } from "../../utils/homebrewForm";
import { parsePastedText } from "../../utils/homebrewPaste";
import Button from "../Button/Button";

// "Fill in from pasted text": paste the rules from a page your group uses,
// check what QuestKeeper found, and fill in the ticked ones. Descriptions
// stay for the player to write; the pasted text is kept beside the form as a
// reference (and never saved).
//
// onFill(parsed, chosenKeys): applies the ticked suggestions.
// onReference(sections | null): the pasted text, split by heading.
function PasteFill({ category, onFill, onReference }) {
  const textId = useId();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [chosen, setChosen] = useState([]);
  const [filled, setFilled] = useState(0);
  const label = CATEGORY_LABELS[category].toLowerCase();

  function handleRead() {
    const result = parsePastedText(category, text);
    setParsed(result);
    setChosen(result.found.map((line) => line.key));
    setFilled(0);
    onReference(result.sections.length > 0 ? result.sections : null);
  }

  function toggle(key) {
    setChosen((keys) => (keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]));
  }

  function handleFill() {
    onFill(parsed, chosen);
    setFilled(chosen.length);
  }

  return (
    <details className="homebrew-paste">
      <summary className="homebrew-paste__summary">Fill in from pasted text</summary>

      <p className="homebrew-form__hint">
        Copy the {label}&apos;s rules from a page your group uses (like
        Wikidot) and paste them below. QuestKeeper fills in the numbers,
        skills and names for you to check. Descriptions are yours to write in
        your own words: your pasted text stays beside the form while you do,
        and it isn&apos;t saved.
      </p>

      <label className="homebrew-form__field" htmlFor={textId}>
        <span className="homebrew-form__label">Pasted rules</span>
        <textarea
          id={textId}
          className="homebrew-form__textarea"
          rows={6}
          maxLength={20000}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      <div className="homebrew-form__row">
        <Button type="button" variant="secondary" disabled={!text.trim()} onClick={handleRead}>
          Read it
        </Button>
      </div>

      {parsed && parsed.found.length === 0 && (
        <p className="homebrew-form__hint" role="status">
          Couldn&apos;t find any {label} rules in that text. Try copying the
          whole section, headings included.
        </p>
      )}

      {parsed && parsed.found.length > 0 && (
        <fieldset className="homebrew-form__group">
          <legend className="homebrew-form__label">Found these. Untick any you don&apos;t want.</legend>
          {parsed.found.map((line) => (
            <label className="homebrew-form__check homebrew-paste__found" key={line.key}>
              <input type="checkbox" checked={chosen.includes(line.key)} onChange={() => toggle(line.key)} />
              <span>
                <b>{line.label}:</b> {line.value}
              </span>
            </label>
          ))}
          <div className="homebrew-form__row">
            <Button type="button" disabled={chosen.length === 0} onClick={handleFill}>
              Fill in the ticked ones
            </Button>
          </div>
          {filled > 0 && (
            <p className="homebrew-form__hint" role="status">
              Filled in. Check them below, add descriptions in your own words,
              then save.
            </p>
          )}
        </fieldset>
      )}
    </details>
  );
}

export default PasteFill;

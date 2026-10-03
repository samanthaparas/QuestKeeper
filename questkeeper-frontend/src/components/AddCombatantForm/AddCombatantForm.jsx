import { useState } from "react";
import {
  PIECE_ICONS,
  cleanStatBlock,
  emptyStatBlock,
  pieceNames,
  readStatBlock,
} from "../../utils/statBlock";
import Button from "../Button/Button";
import StatBlockFields from "../StatBlockFields/StatBlockFields";
import "./AddCombatantForm.css";

// Adds one or many monsters, friendly NPCs, or manually tracked party members.
// `templates` are the DM's saved library entries; picking one fills the form.
function AddCombatantForm({ onAdd, templates = [] }) {
  const [kind, setKind] = useState("monster");
  const [name, setName] = useState("");
  const [count, setCount] = useState("1");
  const [maxHp, setMaxHp] = useState("");
  const [armorClass, setArmorClass] = useState("");
  const [initiative, setInitiative] = useState("");
  const [statBlock, setStatBlock] = useState(emptyStatBlock());
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showPieces, setShowPieces] = useState(false);
  const [pieces, setPieces] = useState([]);
  const [isBusy, setIsBusy] = useState(false);

  const hp = Number(maxHp);
  const total = Math.max(1, Math.min(Number(count) || 1, 20));
  const previewNames = pieceNames(name.trim() || "Monster", total, pieces);
  const canSubmit = name.trim() !== "" && Number.isInteger(hp) && hp >= 1;

  function fillFromTemplate(templateId) {
    const template = templates.find((entry) => entry.id === templateId);
    if (!template) return;

    setKind(template.kind);
    setName(template.name);
    setMaxHp(String(template.max_hp));
    setArmorClass(template.armor_class === null ? "" : String(template.armor_class));
    setStatBlock(readStatBlock(template.stat_block));
    setShowDetails(true);
  }

  function updatePiece(index, field, value) {
    setPieces((previous) => {
      const next = Array.from(
        { length: Math.max(previous.length, index + 1) },
        (_, i) => previous[i] ?? { icon: "", label: "" },
      );
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit || isBusy) return;

    setIsBusy(true);
    try {
      const added = await onAdd({
        kind,
        name: name.trim(),
        count: Number(count) || 1,
        maxHp: hp,
        armorClass: armorClass === "" ? null : Number(armorClass),
        initiative: initiative === "" ? null : Number(initiative),
        statBlock: cleanStatBlock(statBlock),
        saveToLibrary,
        pieces: pieces.slice(0, total),
      });

      // Keep what was typed if adding failed, so nothing has to be retyped.
      if (added === false) return;

      setName("");
      setCount("1");
      setMaxHp("");
      setArmorClass("");
      setInitiative("");
      setStatBlock(emptyStatBlock());
      setSaveToLibrary(false);
      setShowDetails(false);
      setShowPieces(false);
      setPieces([]);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form className="add-combatant" onSubmit={handleSubmit}>
      <div className="add-combatant__kinds" role="radiogroup" aria-label="What are you adding">
        <label className="add-combatant__kind">
          <input
            type="radio"
            name="combatant-kind"
            checked={kind === "monster"}
            onChange={() => setKind("monster")}
          />
          Enemy
        </label>
        <label className="add-combatant__kind">
          <input
            type="radio"
            name="combatant-kind"
            checked={kind === "ally"}
            onChange={() => setKind("ally")}
          />
          Friendly NPC or party member
        </label>

        {templates.length > 0 && (
          <select
            className="add-combatant__field"
            aria-label="Add from my library"
            value=""
            onChange={(event) => fillFromTemplate(event.target.value)}
          >
            <option value="">From my library...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.kind === "ally" ? " (friendly)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <p className="add-combatant__tip">
        <strong>Adding several of the same monster?</strong> Type the name once and set{" "}
        <em>How many</em> (up to 20). Each one gets its own HP, and you can give each a
        nickname or icon under <em>Tell them apart</em>.
      </p>

      <div className="add-combatant__row">
        <input
          className="add-combatant__field add-combatant__field--name"
          aria-label="Name"
          placeholder={kind === "ally" ? "Name (e.g. Sir Pip)" : "Name (e.g. Goblin)"}
          maxLength={70}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          className="add-combatant__number"
          type="number"
          aria-label="How many"
          placeholder="How many?"
          min="1"
          max="20"
          value={count}
          onChange={(event) => setCount(event.target.value)}
        />
        <input
          className="add-combatant__number"
          type="number"
          aria-label="HP"
          placeholder="HP"
          value={maxHp}
          onChange={(event) => setMaxHp(event.target.value)}
        />
        <input
          className="add-combatant__number"
          type="number"
          aria-label="AC"
          placeholder="AC"
          value={armorClass}
          onChange={(event) => setArmorClass(event.target.value)}
        />
        <input
          className="add-combatant__number"
          type="number"
          aria-label="Initiative"
          placeholder="Init"
          value={initiative}
          onChange={(event) => setInitiative(event.target.value)}
        />
      </div>

      <div className="add-combatant__row">
        <Button
          type="button"
          variant="secondary"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((open) => !open)}
        >
          {showDetails ? "Hide attacks and notes" : "Attacks and notes"}
        </Button>
        <label className="add-combatant__kind">
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(event) => setSaveToLibrary(event.target.checked)}
          />
          Also save to my library
        </label>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={showPieces}
          onClick={() => setShowPieces((open) => !open)}
        >
          {showPieces ? "Hide nicknames and icons" : "Tell them apart"}
        </Button>
        <Button type="submit" disabled={!canSubmit || isBusy}>
          {Number(count) > 1 ? `Add ${Math.min(Number(count), 20)}` : "Add"}
        </Button>
      </div>

      {showPieces && (
        <fieldset className="add-combatant__pieces">
          <legend>Nicknames and icons (optional)</legend>
          <p className="add-combatant__tip">
            Match each one to the piece on your table, like a red duck or a blue penguin. Everyone at
            the table sees the name and icon.
          </p>
          {previewNames.map((preview, index) => (
            <div className="add-combatant__piece" key={index}>
              <select
                className="add-combatant__field"
                aria-label={`Icon for monster ${index + 1}`}
                value={pieces[index]?.icon ?? ""}
                onChange={(event) => updatePiece(index, "icon", event.target.value)}
              >
                <option value="">No icon</option>
                {PIECE_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <input
                className="add-combatant__field add-combatant__field--name"
                aria-label={`Nickname for monster ${index + 1}`}
                placeholder="e.g. red duck"
                maxLength={30}
                value={pieces[index]?.label ?? ""}
                onChange={(event) => updatePiece(index, "label", event.target.value)}
              />
              <span className="add-combatant__preview">{preview}</span>
            </div>
          ))}
        </fieldset>
      )}

      {showDetails && <StatBlockFields value={statBlock} onChange={setStatBlock} idPrefix="add" />}
    </form>
  );
}

export default AddCombatantForm;

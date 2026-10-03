import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from "../../utils/tableStore";
import { cleanStatBlock, emptyStatBlock, readStatBlock } from "../../utils/statBlock";
import Button from "../../components/Button/Button";
import StatBlockFields from "../../components/StatBlockFields/StatBlockFields";
import "./LibraryPage.css";

const BLANK = {
  name: "",
  kind: "monster",
  maxHp: "",
  armorClass: "",
  statBlock: emptyStatBlock(),
};

// Your private monster library: prepare monsters and friendly NPCs ahead of
// time (with their stat blocks), then add them to any table in one click.
function LibraryPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((loadError) => setError(loadError.message))
      .finally(() => setIsLoading(false));
  }, []);

  function startEdit(template) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      kind: template.kind,
      maxHp: String(template.max_hp),
      armorClass: template.armor_class === null ? "" : String(template.armor_class),
      statBlock: readStatBlock(template.stat_block),
    });
    setError("");
  }

  function reset() {
    setEditingId(null);
    setForm(BLANK);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const maxHp = Number(form.maxHp);

    if (!form.name.trim()) return setError("Give it a name.");
    if (!Number.isInteger(maxHp) || maxHp < 1) return setError("HP must be at least 1.");

    const payload = {
      name: form.name,
      kind: form.kind,
      maxHp,
      armorClass: form.armorClass === "" ? null : Number(form.armorClass),
      statBlock: cleanStatBlock(form.statBlock),
    };

    setError("");
    setIsBusy(true);
    try {
      if (editingId) {
        const saved = await updateTemplate(editingId, payload);
        setTemplates((previous) =>
          previous.map((entry) => (entry.id === editingId ? saved : entry)),
        );
      } else {
        const saved = await createTemplate(payload);
        setTemplates((previous) =>
          [...previous, saved].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      reset();
    } catch (saveError) {
      setError(saveError.message ?? "Could not save.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(template) {
    if (!window.confirm(`Delete ${template.name} from your library?`)) return;

    try {
      await deleteTemplate(template.id);
      setTemplates((previous) => previous.filter((entry) => entry.id !== template.id));
      if (editingId === template.id) reset();
    } catch (deleteError) {
      setError(deleteError.message ?? "Could not delete.");
    }
  }

  return (
    <main className="library-page">
      <div className="library-page__content">
        <h1 className="library-page__title">Monster Library</h1>
        <p className="library-page__description">
          Prepare monsters and friendly NPCs ahead of game night. Only you can see your
          library. Add anything in it to a fight from your table's "Add monsters and NPCs"
          form. <Link to="/tables">Go to Tables</Link>
        </p>

        {error && (
          <p className="library-page__error" role="alert">
            {error}
          </p>
        )}

        <form className="library-page__card" onSubmit={handleSubmit}>
          <h2 className="library-page__card-title">
            {editingId ? "Edit this entry" : "Add to your library"}
          </h2>

          <div className="library-page__row" role="radiogroup" aria-label="What kind">
            <label className="library-page__kind">
              <input
                type="radio"
                name="library-kind"
                checked={form.kind === "monster"}
                onChange={() => setForm({ ...form, kind: "monster" })}
              />
              Enemy
            </label>
            <label className="library-page__kind">
              <input
                type="radio"
                name="library-kind"
                checked={form.kind === "ally"}
                onChange={() => setForm({ ...form, kind: "ally" })}
              />
              Friendly NPC
            </label>
          </div>

          <div className="library-page__row">
            <input
              className="library-page__field"
              aria-label="Name"
              placeholder="Name (e.g. Bugbear)"
              maxLength={80}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <input
              className="library-page__number"
              type="number"
              aria-label="HP"
              placeholder="HP"
              value={form.maxHp}
              onChange={(event) => setForm({ ...form, maxHp: event.target.value })}
            />
            <input
              className="library-page__number"
              type="number"
              aria-label="AC"
              placeholder="AC"
              value={form.armorClass}
              onChange={(event) => setForm({ ...form, armorClass: event.target.value })}
            />
          </div>

          <StatBlockFields
            value={form.statBlock}
            onChange={(statBlock) => setForm({ ...form, statBlock })}
            idPrefix="library"
          />

          <div className="library-page__row">
            <Button type="submit" disabled={isBusy}>
              {editingId ? "Save changes" : "Add to library"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={reset}>
                Cancel
              </Button>
            )}
          </div>
        </form>

        <h2 className="library-page__section-title">Your library</h2>

        {isLoading && <p className="library-page__empty">Loading your library...</p>}

        {!isLoading && templates.length === 0 && (
          <p className="library-page__empty">
            Nothing here yet. Add a monster above, or tick "Also save to my library" when
            you add one at a table.
          </p>
        )}

        <ul className="library-page__list">
          {templates.map((template) => (
            <li className="library-page__item" key={template.id}>
              <div className="library-page__item-info">
                <span className="library-page__item-name">
                  {template.name}
                  {template.kind === "ally" && (
                    <span className="library-page__tag">Friendly</span>
                  )}
                </span>
                <span className="library-page__item-meta">
                  {template.max_hp} HP
                  {template.armor_class ? ` · AC ${template.armor_class}` : ""}
                  {(template.stat_block?.attacks ?? []).length > 0 &&
                    ` · ${template.stat_block.attacks.map((attack) => attack.name).join(", ")}`}
                </span>
              </div>
              <div className="library-page__item-actions">
                <Button variant="secondary" onClick={() => startEdit(template)}>
                  Edit
                </Button>
                <Button variant="danger" onClick={() => handleDelete(template)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default LibraryPage;

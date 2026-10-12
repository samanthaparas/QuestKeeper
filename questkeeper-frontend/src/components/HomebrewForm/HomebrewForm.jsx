import { useState } from "react";
import {
  CATEGORY_LABELS,
  formToEntry,
  previewHomebrew,
  validateHomebrewForm,
} from "../../utils/homebrewForm";
import {
  mapRaceToPanel,
  mapSubraceToPanel,
  mapBackgroundToPanel,
  mapClassToPanel,
  mapSubclassToPanel,
} from "../../utils/srdDetails";
import Button from "../Button/Button";
import DetailPanel from "../DetailPanel/DetailPanel";
import CategoryFields from "./CategoryFields";
import PasteFill from "./PasteFill";
import { applySuggestions } from "../../utils/homebrewPaste";
import "./HomebrewForm.css";

const PANEL_MAPPERS = {
  race: mapRaceToPanel,
  subrace: mapSubraceToPanel,
  background: mapBackgroundToPanel,
  class: mapClassToPanel,
  subclass: mapSubclassToPanel,
};

// The guided homebrew form with a live preview beside it. The preview uses
// the same detail panel players see when picking options, so what you see
// here is what they'll get.
//
// initialForm: from emptyHomebrewForm() or entryToForm().
// onSave(entry): saves; may throw, and the message is shown.
// classOptions: the player's homebrew classes (for "which class is this
// subclass for?").
function HomebrewForm({ initialForm, raceOptions = [], classOptions = [], onSave, onCancel }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Text pasted into "Fill in from pasted text", shown beside the form as a
  // reference while writing descriptions. Never saved.
  const [reference, setReference] = useState(null);
  const [asideView, setAsideView] = useState("preview"); // or "reference"

  const label = CATEGORY_LABELS[form.category];
  const preview = PANEL_MAPPERS[form.category](previewHomebrew(form));

  function set(changes) {
    setForm((previous) => ({ ...previous, ...changes }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = validateHomebrewForm(form);
    if (problem) return setError(problem);

    setError("");
    setIsSaving(true);
    try {
      await onSave(formToEntry(form));
    } catch (saveError) {
      setError(saveError.message ?? "Could not save.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="homebrew-form">
      <form className="homebrew-form__card" onSubmit={handleSubmit}>
        <h2 className="homebrew-form__title">
          {form.id ? `Edit ${form.name || label}` : `New homebrew ${label.toLowerCase()}`}
        </h2>

        {/* Copyright reminder: summaries are fine, copied book text isn't. */}
        <p className="homebrew-form__note">
          Write it in your own words. For an option from a published book, add a
          short summary and the numbers, plus a link to where your group reads the
          full rules. Please don't paste the book's text.
        </p>

        <PasteFill
          category={form.category}
          onFill={(parsed, keys) =>
            setForm((previous) => ({ ...previous, data: applySuggestions(previous.data, parsed, keys) }))
          }
          onReference={(sections) => {
            setReference(sections);
            setAsideView(sections ? "reference" : "preview");
          }}
        />

        <label className="homebrew-form__field" htmlFor="homebrew-name">
          <span className="homebrew-form__label">Name</span>
          <input
            id="homebrew-name"
            className="homebrew-form__input"
            maxLength={80}
            value={form.name}
            onChange={(event) => set({ name: event.target.value })}
          />
        </label>

        <div className="homebrew-form__row">
          <label className="homebrew-form__field" htmlFor="homebrew-based-on">
            <span className="homebrew-form__label">Based on (optional)</span>
            <input
              id="homebrew-based-on"
              className="homebrew-form__input"
              placeholder="e.g. Xanathar's Guide, or our campaign"
              maxLength={120}
              value={form.basedOn}
              onChange={(event) => set({ basedOn: event.target.value })}
            />
          </label>
          <label className="homebrew-form__field" htmlFor="homebrew-link">
            <span className="homebrew-form__label">Link (optional)</span>
            <input
              id="homebrew-link"
              className="homebrew-form__input"
              type="url"
              placeholder="https://..."
              maxLength={500}
              value={form.linkUrl}
              onChange={(event) => set({ linkUrl: event.target.value })}
            />
          </label>
        </div>

        <label className="homebrew-form__field" htmlFor="homebrew-summary">
          <span className="homebrew-form__label">Summary</span>
          <textarea
            id="homebrew-summary"
            className="homebrew-form__textarea"
            placeholder={`What's this ${label.toLowerCase()} like? A few sentences is plenty.`}
            maxLength={5000}
            rows={4}
            value={form.summary}
            onChange={(event) => set({ summary: event.target.value })}
          />
        </label>

        <CategoryFields
          category={form.category}
          data={form.data}
          raceOptions={raceOptions}
          classOptions={classOptions}
          onChange={(data) => set({ data })}
        />

        {/* Drafts stay private until the author is happy with them. */}
        <fieldset className="homebrew-form__group">
          <legend className="homebrew-form__label">Who can see it</legend>
          <label className="homebrew-form__check">
            <input
              type="radio"
              name="homebrew-visibility"
              checked={form.isShared}
              onChange={() => set({ isShared: true })}
            />
            Shared with my tables and the people I've invited
          </label>
          <label className="homebrew-form__check">
            <input
              type="radio"
              name="homebrew-visibility"
              checked={!form.isShared}
              onChange={() => set({ isShared: false })}
            />
            Private draft (only me)
          </label>
        </fieldset>

        {error && (
          <p className="homebrew-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="homebrew-form__row">
          <Button type="submit" disabled={isSaving}>
            {form.id ? "Save changes" : `Save ${label.toLowerCase()}`}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>

      <aside className="homebrew-form__preview" aria-label="Preview">
        {reference ? (
          // With pasted text: switch between it and the preview.
          <div className="homebrew-form__aside-tabs" role="group" aria-label="Show beside the form">
            {[
              ["reference", "Your pasted text"],
              ["preview", "Preview"],
            ].map(([view, viewLabel]) => (
              <button
                key={view}
                type="button"
                className="homebrew-form__aside-tab"
                aria-pressed={asideView === view}
                onClick={() => setAsideView(view)}
              >
                {viewLabel}
              </button>
            ))}
          </div>
        ) : (
          <p className="homebrew-form__preview-label">Preview</p>
        )}

        {reference && asideView === "reference" ? (
          <section className="homebrew-form__reference" aria-label="Your pasted text">
            <p className="homebrew-form__hint">
              For reference while you write. It isn&apos;t saved.
            </p>
            {reference.map((section, index) => (
              <div key={index} className="homebrew-form__reference-section">
                {section.name && <h3>{section.name}</h3>}
                {section.text && <p>{section.text}</p>}
              </div>
            ))}
          </section>
        ) : (
          <DetailPanel selectedResult={preview} animate={false} />
        )}
      </aside>
    </div>
  );
}

export default HomebrewForm;

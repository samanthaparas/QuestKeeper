import { useState, useId } from "react";
import "../../pages/CharacterSheetPage/CharacterSheetPage.css";
import Button from "../Button/Button";

function formatNotesLines(notes) {
  return (notes ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function createEmptyValues(fields) {
  return fields.reduce((acc, field) => {
    acc[field.key] = field.defaultValue ?? "";
    return acc;
  }, {});
}

// A field's hint sits under the row of inputs, not inside it, so a long hint
// can't push the other boxes around. Only the first line shows; any further
// lines (like the to-hit breakdown) open from a "How is this worked out?"
// toggle so the form stays tidy.
function FieldHint({ text }) {
  const [summary, ...details] = String(text).split("\n");

  return (
    <div className="character-sheet__field-hint">
      <p className="character-sheet__field-hint-summary">{summary}</p>
      {details.length > 0 && (
        <details className="character-sheet__field-hint-details">
          <summary>How is this worked out?</summary>
          <ul>
            {details.map((line) => (
              <li key={line}>{line.replace(/^•\s*/, "")}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function EditableItemField({ field, value, onChange }) {
  if (field.type === "select") {
    return (
      <select
        className="character-sheet__resource-form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  const className = `character-sheet__resource-form-input${
    field.width ? ` character-sheet__resource-form-input--${field.width}` : ""
  }`;

  return (
    <>
      <input
        type={field.type}
        className={className}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={field.type === "number" ? field.min : undefined}
        list={field.datalistId}
        autoComplete="off"
      />
      {field.datalistId && value && (
        <button
          type="button"
          className="character-sheet__resource-remove"
          onClick={() => onChange("")}
        >
          Clear
        </button>
      )}
      {field.datalistId && (
        <datalist id={field.datalistId}>
          {field.datalistOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      )}
    </>
  );
}

function EditableItemList({
  title,
  items,
  getItemId,
  fields,
  formatPrimaryLabel,
  emptyText,
  addButtonLabel,
  onAdd,
  onUpdate,
  onRemove,
  extraRowContent,
  columns,
  isNameClickable,
  onNameClick,
  rowAction = null,
  footer = null,
  // Optional locking (used for spells): a locked row hides Edit and Remove
  // until it is unlocked, so it can't be changed by accident.
  isLocked = null,
  onToggleLock = null,
}) {
  const primaryField = fields[0];
  const textareaField = fields.find((field) => field.type === "textarea");
  const formFields = fields.filter((field) => field.type !== "textarea");
  const formId = useId();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [values, setValues] = useState(() => createEmptyValues(fields));
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  function resetForm() {
    setValues(createEmptyValues(fields));
    setEditingId(null);
    setIsAdding(false);
  }

  function handleFieldChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));

    const field = fields.find((f) => f.key === key);
    if (field?.getAutofill) {
      Promise.resolve(field.getAutofill(value)).then((autofill) => {
        if (autofill) {
          setValues((prev) => ({ ...prev, ...autofill }));
        }
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!String(values[primaryField.key] ?? "").trim()) return;

    if (editingId) {
      onUpdate(editingId, values);
    } else {
      onAdd(values);
    }

    resetForm();
  }

  function handleEdit(item) {
    const nextValues = fields.reduce((acc, field) => {
      acc[field.key] = item[field.key] != null ? String(item[field.key]) : "";
      return acc;
    }, {});
    setValues(nextValues);
    setEditingId(getItemId(item));
    setIsAdding(true);
  }

  function getLabel(item) {
    return formatPrimaryLabel
      ? formatPrimaryLabel(item)
      : item[primaryField.key];
  }

  function handleRemoveClick(item, id) {
    if (window.confirm(`Remove "${getLabel(item)}"? This can't be undone.`)) {
      onRemove(id);
    }
  }

  function handleUnlockClick(item) {
    if (
      window.confirm(
        `Unlock "${getLabel(item)}"? You'll be able to edit or remove it again.`,
      )
    ) {
      onToggleLock(item);
    }
  }

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function renderPrimaryCell(item, id, notes) {
    const isExpanded = expandedIds.has(id);

    return (
      <span className="character-sheet__resource-name">
        {isNameClickable?.(item) ? (
          <button
            type="button"
            className="character-sheet__srd-link"
            aria-haspopup="dialog"
            onClick={() => onNameClick(item)}
          >
            {getLabel(item)}
          </button>
        ) : (
          getLabel(item)
        )}
        {notes && (
          <>
            <button
              type="button"
              className="character-sheet__details-toggle"
              onClick={() => toggleExpanded(id)}
            >
              {isExpanded ? "▾ Hide details" : "▸ Show details"}
            </button>
            {isExpanded && (
              <ul className="character-sheet__attacks-notes-list">
                {formatNotesLines(notes).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </span>
    );
  }

  // Passed as a CSS variable (not an inline grid-template-columns) so the
  // stylesheet can still re-flow the rows on phones.
  const columnStyle = columns
    ? {
        "--item-columns": `minmax(220px, 1fr) ${columns.map((col) => col.width).join(" ")} 140px`,
      }
    : undefined;

  return (
    <section className="character-sheet__section">
      <div className="character-sheet__section-header-row">
        <h2 className="character-sheet__section-title">{title}</h2>
        <div className="character-sheet__section-header-actions">
          {isAdding && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
          {isAdding ? (
            <Button type="submit" form={formId}>
              {editingId ? "Save Changes" : addButtonLabel}
            </Button>
          ) : (
            <Button onClick={() => setIsAdding(true)}>{addButtonLabel}</Button>
          )}
        </div>
      </div>

      {isAdding && (
        <form
          id={formId}
          className="character-sheet__attack-form"
          onSubmit={handleSubmit}
        >
          <div className="character-sheet__resource-form">
            {formFields.map((field) => (
              <EditableItemField
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(value) => handleFieldChange(field.key, value)}
              />
            ))}
          </div>

          {formFields
            .map((field) => field.getHint?.(values))
            .filter(Boolean)
            .map((hint) => (
              <FieldHint key={hint} text={hint} />
            ))}

          {textareaField && (
            <textarea
              className="character-sheet__textarea"
              placeholder={textareaField.placeholder}
              value={values[textareaField.key]}
              onChange={(e) =>
                handleFieldChange(textareaField.key, e.target.value)
              }
              rows={3}
            />
          )}
        </form>
      )}

      {items.length === 0 ? (
        <p className="character-sheet__empty-prompt">{emptyText}</p>
      ) : columns ? (
        <div className="character-sheet__attacks-table">
          <div className="character-sheet__attacks-header" style={columnStyle}>
            <span>{primaryField.label ?? ""}</span>
            {columns.map((col) => (
              <span key={col.key}>{col.label}</span>
            ))}
            <span></span>
          </div>
          {items.map((item) => {
            const id = getItemId(item);
            const notes = textareaField ? item[textareaField.key] : "";

            return (
              <div
                className="character-sheet__attacks-row"
                style={columnStyle}
                key={id}
              >
                {renderPrimaryCell(item, id, notes)}
                {columns.map((col) => (
                  <span
                    className="character-sheet__attacks-cell"
                    data-label={col.label}
                    key={col.key}
                  >
                    {col.format ? col.format(item) : item[col.key]}
                  </span>
                ))}
                <span className="character-sheet__attacks-actions">
                  {rowAction && (
                    <button
                      type="button"
                      className="character-sheet__resource-add-button"
                      onClick={() => rowAction.onClick(item)}
                    >
                      {rowAction.label}
                    </button>
                  )}
                  <button
                    type="button"
                    className="character-sheet__resource-remove"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="character-sheet__resource-remove"
                    onClick={() => handleRemoveClick(item, id)}
                  >
                    Remove
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="character-sheet__resource-list">
          {items.map((item) => {
            const id = getItemId(item);
            const notes = textareaField ? item[textareaField.key] : "";

            return (
              <li className="character-sheet__resource-row" key={id}>
                {renderPrimaryCell(item, id, notes)}

                {extraRowContent && extraRowContent(item)}

                <span className="character-sheet__attacks-actions">
                  {isLocked?.(item) ? (
                    onToggleLock && (
                      <button
                        type="button"
                        className="character-sheet__resource-remove"
                        onClick={() => handleUnlockClick(item)}
                      >
                        Unlock
                      </button>
                    )
                  ) : (
                    <>
                      {onToggleLock && (
                        <button
                          type="button"
                          className="character-sheet__resource-remove"
                          aria-label={`Lock ${getLabel(item)}`}
                          onClick={() => onToggleLock(item)}
                        >
                          Lock
                        </button>
                      )}
                      <button
                        type="button"
                        className="character-sheet__resource-remove"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="character-sheet__resource-remove"
                        onClick={() => handleRemoveClick(item, id)}
                      >
                        Remove
                      </button>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {footer}
    </section>
  );
}

export default EditableItemList;

import { useState } from "react";
import "../../pages/CharacterSheetPage/CharacterSheetPage.css";

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
    <input
      type={field.type}
      className={className}
      placeholder={field.placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={field.type === "number" ? field.min : undefined}
    />
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
}) {
  const primaryField = fields[0];
  const textareaField = fields.find((field) => field.type === "textarea");
  const formFields = fields.filter((field) => field.type !== "textarea");

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
        {getLabel(item)}
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

  const gridTemplateColumns = columns
    ? `minmax(220px, 1fr) ${columns.map((col) => col.width).join(" ")} 140px`
    : undefined;

  return (
    <section className="character-sheet__section">
      <div className="character-sheet__section-header-row">
        <h2 className="character-sheet__section-title">{title}</h2>
        {!isAdding && (
          <button
            type="button"
            className="character-sheet__resource-add-button"
            onClick={() => setIsAdding(true)}
          >
            {addButtonLabel}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="character-sheet__empty-text">{emptyText}</p>
      ) : columns ? (
        <div className="character-sheet__attacks-table">
          <div
            className="character-sheet__attacks-header"
            style={{ gridTemplateColumns }}
          >
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
                style={{ gridTemplateColumns }}
                key={id}
              >
                {renderPrimaryCell(item, id, notes)}
                {columns.map((col) => (
                  <span className="character-sheet__attacks-cell" key={col.key}>
                    {col.format ? col.format(item) : item[col.key]}
                  </span>
                ))}
                <span className="character-sheet__attacks-actions">
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
              </li>
            );
          })}
        </ul>
      )}

      {isAdding && (
        <form className="character-sheet__attack-form" onSubmit={handleSubmit}>
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

          <div className="character-sheet__attack-form-actions">
            <button
              type="button"
              className="character-sheet__resource-remove"
              onClick={resetForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="character-sheet__resource-add-button"
            >
              {editingId ? "Save Changes" : addButtonLabel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default EditableItemList;

import { useId } from "react";
import "./CreationTableChoice.css";

// "Making this character for: [Breakfast Club]" above the race, class and
// background pickers. Only shown when the player plays at a table whose DM
// has marked some options as not allowed. Picking the table hides those
// options in the pickers (see creationTable.js).
//
// tables: from tablesWithRules. value: the chosen table's id, or "".
function CreationTableChoice({ tables, value, onChange }) {
  const id = useId();
  if (tables.length === 0) return null;
  const chosen = tables.find((table) => table.id === value);

  return (
    <p className="creation-table-choice">
      <label htmlFor={id}>Making this character for</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">No table in particular</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.name}
          </option>
        ))}
      </select>
      <span className="creation-table-choice__note">
        {chosen
          ? `Options ${chosen.name}'s DM doesn't allow are hidden below.`
          : "Pick a table to hide the options its DM doesn't allow."}
      </span>
    </p>
  );
}

export default CreationTableChoice;

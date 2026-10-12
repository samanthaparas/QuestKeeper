import { useCallback, useEffect, useRef, useState } from "react";
import { rollCheck, rollDamageFor } from "../utils/rolls";
import { listCharacterTables, logRoll } from "../utils/tableStore";

// Remembered per character: whether rolls are shared, and (the same choice
// the turn banner uses) which table they go to.
function readStored(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Remembering is a convenience; the choice still works for this visit.
  }
}

// Click-to-roll for one character sheet: the next d20's mode (normal,
// advantage, disadvantage), the latest roll, and sharing rolls with the
// character's table. Advantage and disadvantage last for one roll, the way
// they do at the table.
export function useSheetRolls(characterId, characterName) {
  const [mode, setMode] = useState("normal");
  const [lastRoll, setLastRoll] = useState(null);
  const [tables, setTables] = useState([]);
  const [shareChoice, setShareChoice] = useState(null);
  const counter = useRef(0);

  // The tables this character sits at (none when signed out or not seated).
  useEffect(() => {
    if (!characterId) return undefined;
    let ignore = false;
    listCharacterTables(characterId)
      .then((found) => !ignore && setTables(found))
      .catch(() => !ignore && setTables([]));
    return () => {
      ignore = true;
    };
  }, [characterId]);

  const preferredId = readStored(`qk-active-table-${characterId}`);
  const table = tables.find((entry) => entry.id === preferredId) ?? tables[0] ?? null;
  // Shared by default once seated at a table.
  const share = shareChoice ?? readStored(`qk-share-rolls-${characterId}`) !== "off";
  const sharing = Boolean(table) && share;

  function setShare(on) {
    writeStored(`qk-share-rolls-${characterId}`, on ? "on" : "off");
    setShareChoice(on);
  }

  const show = useCallback(
    (roll) => {
      counter.current += 1;
      const id = counter.current;
      setLastRoll({ ...roll, id, status: sharing ? "sharing" : "private" });
      if (!sharing) return;
      logRoll(table.id, { who: characterName, label: roll.label, detail: roll.detail, total: roll.total })
        .then(() => setLastRoll((current) => (current?.id === id ? { ...current, status: "shared" } : current)))
        .catch(() => setLastRoll((current) => (current?.id === id ? { ...current, status: "failed" } : current)));
    },
    [sharing, table, characterName],
  );

  const roll = useCallback(
    (label, bonus, options = {}) => {
      show(rollCheck({ label, bonus, mode, attack: options.attack ?? null }));
      setMode("normal");
    },
    [mode, show],
  );

  const rollDamage = useCallback(
    (label, damage, { crit = false } = {}) => {
      const result = rollDamageFor({ label, damage, crit });
      if (result) show(result);
    },
    [show],
  );

  return {
    mode,
    setMode,
    lastRoll,
    dismiss: () => setLastRoll(null),
    roll,
    rollDamage,
    tableName: table?.name ?? null,
    share,
    sharing,
    setShare,
  };
}

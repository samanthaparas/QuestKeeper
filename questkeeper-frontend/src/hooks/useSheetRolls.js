import { useCallback, useEffect, useRef, useState } from "react";
import { checkFromDice, damageRollFromDice, rollCheck, rollDamageFor } from "../utils/rolls";
import { parseDamage, parseDiceNumbers } from "../utils/attacks";
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
  // "Real dice": tapping a roll asks for the numbers on your own dice instead
  // of the app rolling. `pending` is the roll waiting for them.
  const [realChoice, setRealChoice] = useState(null);
  const [pending, setPending] = useState(null);
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

  const realDice = realChoice ?? readStored(`qk-real-dice-${characterId}`) === "on";

  function setRealDice(on) {
    writeStored(`qk-real-dice-${characterId}`, on ? "on" : "off");
    setRealChoice(on);
    setPending(null);
  }

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

  // options.onResult(roll) is called with the finished roll, for rolls the
  // sheet acts on (a death save fills in a success or failure; a concentration
  // save can end the spell). With real dice the roll finishes later, once the
  // player has typed their numbers, so those callers must use onResult.
  const roll = useCallback(
    (label, bonus, options = {}) => {
      if (realDice) {
        setPending({
          type: "check",
          label,
          bonus: Number(bonus) || 0,
          attack: options.attack ?? null,
          onResult: options.onResult ?? null,
        });
        return null;
      }
      const result = rollCheck({ label, bonus, mode, attack: options.attack ?? null });
      show(result);
      setMode("normal");
      options.onResult?.(result);
      return result;
    },
    [mode, show, realDice],
  );

  const rollDamage = useCallback(
    (label, damage, { crit = false } = {}) => {
      // Damage the app can't read as dice is always rolled (or shown) as before.
      if (realDice && parseDamage(damage)) {
        setPending({ type: "damage", label, damage, crit });
        return;
      }
      const result = rollDamageFor({ label, damage, crit });
      if (result) show(result);
    },
    [show, realDice],
  );

  // The player typed the numbers on their dice ("6, 2, 3"). Returns an error
  // in plain words to show beside the box, or null once the roll is done.
  const submitRealDice = useCallback(
    (text) => {
      if (!pending) return null;
      const dice = parseDiceNumbers(text);
      if (!dice) return "Type the numbers on your dice, separated by commas.";

      if (pending.type === "check") {
        const result = checkFromDice({
          label: pending.label,
          bonus: pending.bonus,
          mode,
          dice,
          attack: pending.attack,
        });
        if (result.error) return result.error;
        show(result);
        setMode("normal");
        setPending(null);
        pending.onResult?.(result);
        return null;
      }

      const result = damageRollFromDice({
        label: pending.label,
        damage: pending.damage,
        dice,
        crit: pending.crit,
      });
      if (result.error) return result.error;
      show(result);
      setPending(null);
      return null;
    },
    [pending, mode, show],
  );

  return {
    mode,
    setMode,
    lastRoll,
    dismiss: () => setLastRoll(null),
    roll,
    rollDamage,
    realDice,
    setRealDice,
    pending,
    submitRealDice,
    cancelRealDice: () => setPending(null),
    tableId: table?.id ?? null,
    tableSession: table?.session_number ?? 1,
    tableName: table?.name ?? null,
    share,
    sharing,
    setShare,
  };
}

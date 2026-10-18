import { useCallback, useEffect, useRef, useState } from "react";
import { checkFromDice, damageRollFromDice, rollCheck, rollDamageFor } from "../utils/rolls";
import {
  checkExtraDamage,
  damageFromDice,
  parseDamage,
  parseDiceNumbers,
  rollDamage as rollDamageText,
} from "../utils/attacks";
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

// The roll history kept per character on this device: the last HISTORY_LIMIT
// rolls, newest first.
const HISTORY_LIMIT = 100;

function readHistory(characterId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(`qk-roll-history-${characterId}`) ?? "[]");
    return Array.isArray(saved) ? saved.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
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
  // Every roll made on this sheet, newest first, so a quick roll can be looked
  // at again later (the Rolls tab). Kept on this device.
  const [historyState, setHistoryState] = useState({ id: null, entries: [] });
  // A different character (or the first load): read that character's saved
  // history instead of showing the last one's.
  if (characterId && historyState.id !== characterId) {
    setHistoryState({ id: characterId, entries: readHistory(characterId) });
  }
  const history = historyState.id === characterId ? historyState.entries : [];
  const setHistory = useCallback(
    (update) => setHistoryState((state) => ({ ...state, entries: update(state.entries) })),
    [],
  );
  const historyIds = useRef({});
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

  // Save the history again whenever it changes.
  useEffect(() => {
    if (!characterId || historyState.id !== characterId) return;
    try {
      window.localStorage.setItem(`qk-roll-history-${characterId}`, JSON.stringify(historyState.entries));
    } catch {
      // Remembering is a convenience; the rolls still show this visit.
    }
  }, [historyState, characterId]);

  function clearHistory() {
    setHistory(() => []);
  }

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
      // Remember it, with only what the history list needs.
      const entryId = `${Date.now()}-${id}`;
      historyIds.current[id] = entryId;
      setHistory((entries) =>
        [
          {
            id: entryId,
            at: Date.now(),
            kind: roll.kind,
            label: roll.label,
            total: roll.total,
            detail: roll.detail,
            isNatural20: Boolean(roll.isNatural20),
            isNatural1: Boolean(roll.isNatural1),
            isCrit: Boolean(roll.isCrit),
            extras: [],
          },
          ...entries,
        ].slice(0, HISTORY_LIMIT),
      );
      if (!sharing) return;
      logRoll(table.id, { who: characterName, label: roll.label, detail: roll.detail, total: roll.total })
        .then(() => setLastRoll((current) => (current?.id === id ? { ...current, status: "shared" } : current)))
        .catch(() => setLastRoll((current) => (current?.id === id ? { ...current, status: "failed" } : current)));
    },
    [sharing, table, characterName, setHistory],
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

  // Adds the extra dice or bonus to the damage roll now on screen: its total and
  // its breakdown grow, and it is shared with the table as its own line.
  const addExtraToLastRoll = useCallback(
    (baseId, label, rolled) => {
      setLastRoll((current) =>
        current?.id === baseId
          ? {
              ...current,
              total: current.total + rolled.total,
              detail: `${current.detail} | ${label} ${rolled.text}`,
              // What's been added, so the card can say so.
              extras: [...(current.extras ?? []), { label, total: rolled.total }],
            }
          : current,
      );
      // The history entry grows along with the roll on screen.
      const entryId = historyIds.current[baseId];
      if (entryId) {
        setHistory((entries) =>
          entries.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  total: entry.total + rolled.total,
                  detail: `${entry.detail} | ${label} ${rolled.text}`,
                  extras: [...(entry.extras ?? []), { label, total: rolled.total }],
                }
              : entry,
          ),
        );
      }
      if (sharing) {
        logRoll(table.id, {
          who: characterName,
          label: `${label} (extra damage)`,
          detail: rolled.text.replace(/ = \d+$/, ""),
          total: rolled.total,
        }).catch(() => {});
      }
    },
    [sharing, table, characterName, setHistory],
  );

  // "Add extra damage" on a damage roll (a smite, a sneak attack). The app
  // rolls the extra. With real dice, diceText holds the numbers the player
  // typed in the same form; without it, a prompt asks for them next. Returns
  // an error in plain words, or null.
  const addExtraDamage = useCallback(
    (extraText, name, diceText = null) => {
      const base = lastRoll;
      if (!base || base.kind !== "damage") return "Roll damage first, then add the extra.";
      const check = checkExtraDamage(extraText);
      if (check.error) return check.error;
      const label = String(name ?? "").trim() || "Extra";
      const crit = Boolean(base.isCrit);

      if (realDice && check.dice > 0) {
        if (diceText === null) {
          setPending({ type: "extra", label, damage: extraText, crit, baseId: base.id });
          return null;
        }
        const dice = parseDiceNumbers(diceText);
        if (!dice) return "Type the numbers on your dice, separated by commas.";
        const typed = damageFromDice(extraText, dice, { crit });
        if (typed.error) return typed.error;
        addExtraToLastRoll(base.id, label, typed);
        return null;
      }
      const rolled = rollDamageText(extraText, { crit });
      if (!rolled) return "Write the extra damage like 2d8 or 1d6+2.";
      addExtraToLastRoll(base.id, label, rolled);
      return null;
    },
    [lastRoll, realDice, addExtraToLastRoll],
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

      if (pending.type === "extra") {
        const extra = damageFromDice(pending.damage, dice, { crit: pending.crit });
        if (extra.error) return extra.error;
        addExtraToLastRoll(pending.baseId, pending.label, extra);
        setPending(null);
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
    [pending, mode, show, addExtraToLastRoll],
  );

  return {
    mode,
    setMode,
    lastRoll,
    dismiss: () => setLastRoll(null),
    roll,
    rollDamage,
    history,
    clearHistory,
    realDice,
    setRealDice,
    pending,
    submitRealDice,
    addExtraDamage,
    cancelRealDice: () => setPending(null),
    tableId: table?.id ?? null,
    tableSession: table?.session_number ?? 1,
    tableName: table?.name ?? null,
    share,
    sharing,
    setShare,
  };
}

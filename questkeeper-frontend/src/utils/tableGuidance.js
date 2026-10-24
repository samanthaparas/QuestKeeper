// First-time help for Tables: a DM prep checklist that ticks itself off from
// the table's real state, and a one-line "what now?" tip for players. Only
// public combatant fields are read here (names, kind, initiative), never
// anything from the DM's secret stat blocks.

function hasInitiative(combatant) {
  return combatant.initiative !== null && combatant.initiative !== undefined;
}

function listNames(names) {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

// The four things a DM does before a fight, in order. `current` marks the
// first step that isn't done yet, so the page can highlight it.
// `status` is the short line shown on the step itself; `detail` is the longer
// explanation (and the names of who is still waiting) behind "Step details".
// canStart: whether Start combat is allowed right now (the page's own rule).
export function getDmPrepSteps({ combatants = [], combatActive = false, canStart = true }) {
  const players = combatants.filter((combatant) => combatant.kind === "player");
  const npcs = combatants.filter((combatant) => combatant.kind !== "player");
  const waiting = combatants.filter((combatant) => !hasInitiative(combatant));

  const steps = [
    {
      id: "invite",
      label: "Share the join code",
      done: players.length > 0,
      status: players.length > 0 ? `${players.length} ${players.length === 1 ? "player" : "players"} joined` : "No players yet",
      detail:
        players.length > 0
          ? `${players.length} ${players.length === 1 ? "player has" : "players have"} joined. More can join any time.`
          : "Give your players the code above. They enter it under Join a table on their Tables page.",
    },
    {
      id: "monsters",
      label: "Add the monsters",
      done: npcs.length > 0,
      status: npcs.length > 0 ? `${npcs.length} ${npcs.length === 1 ? "creature" : "creatures"} added` : "None added yet",
      detail:
        npcs.length > 0
          ? `${npcs.length} added. Only you can see their HP, AC and attacks.`
          : 'Use the form below. Tick "Also save to my library" to reuse a monster later.',
    },
    {
      id: "initiative",
      label: "Get everyone's initiative",
      done: combatants.length > 0 && waiting.length === 0,
      status:
        combatants.length === 0
          ? "Nobody to roll yet"
          : waiting.length > 0
            ? `Waiting for ${waiting.length} ${waiting.length === 1 ? "initiative" : "initiatives"}`
            : "Everyone has rolled",
      detail:
        combatants.length === 0
          ? "Players roll on their own screens. Roll for monsters with the button below."
          : waiting.length > 0
            ? `Still waiting on ${listNames(waiting.map((combatant) => combatant.name))}.`
            : "Everyone has rolled.",
    },
    {
      id: "start",
      label: "Start combat",
      done: combatActive,
      status: combatActive ? "Combat is on" : canStart ? "Ready to start" : "Set at least one initiative",
      detail:
        "Turns go from the highest initiative down. Use Next turn to move on.",
    },
  ];

  const currentIndex = steps.findIndex((step) => !step.done);
  return steps.map((step, index) => ({
    ...step,
    current: index === currentIndex,
  }));
}

// A single sentence telling a player what to do right now, or null when
// there's nothing useful to add (the page already asks for initiative).
export function getPlayerTableTip({
  me,
  combatActive = false,
  isMyTurn = false,
}) {
  if (!me) return null;

  if (!combatActive) {
    if (!hasInitiative(me)) return null;
    return "You're ready. When the DM starts combat, the turn order shows here and on your character sheet.";
  }

  if (isMyTurn) {
    return "It's your turn! Attack from your character sheet: open the Actions tab and tap Attack next to a weapon. Tap End my turn when you're done.";
  }

  return "Wait for your turn. A banner on your character sheet tells you when you're up, and asks you to apply damage if an enemy hits you.";
}

// Nudges ride on the table's activity log (the DM's dm_log), so they need no
// new database table: everyone sees a friendly line in the log, and the
// nudged player's "Roll initiative" card lights up.
export const NEW_ENCOUNTER_MESSAGE = "🧹 The DM started a new encounter.";

const NUDGE_ENDING = ", the DM is waiting for your initiative roll!";

export function nudgeMessage(name) {
  return `🔔 ${name}${NUDGE_ENDING}`;
}

// Nudges and the new-encounter marker are pre-fight housekeeping. They stay
// in the activity log, but the sheet's turn banner skips them so a nudge
// doesn't linger as "the latest thing that happened" once the fight starts.
export function isHousekeepingMessage(message = "") {
  return (
    message === NEW_ENCOUNTER_MESSAGE ||
    (message.startsWith("🔔 ") && message.endsWith(NUDGE_ENDING))
  );
}

// The newest event worth showing in the turn banner, or null.
export function latestGameEvent(events = []) {
  return events.find((event) => !isHousekeepingMessage(event.message)) ?? null;
}

// The DM's latest nudge for this name since the last new encounter, or null.
// Each nudge is its own log line with its own id, so the player's card can
// tell a fresh nudge (shake it) from one it has already shown.
// `events` are newest first, as the table page loads them.
export function findActiveNudge(events = [], name) {
  const nudge = nudgeMessage(name);
  for (const event of events) {
    if (event.message === NEW_ENCOUNTER_MESSAGE) return null;
    if (event.message === nudge) return event;
  }
  return null;
}

export function hasActiveNudge(events = [], name) {
  return findActiveNudge(events, name) !== null;
}

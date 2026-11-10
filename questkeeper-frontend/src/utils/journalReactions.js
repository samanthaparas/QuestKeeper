// Reactions on table journal notes (see 20261109_journal_reactions.sql): the
// five choices, and how a note's reactions are counted and named for display.
// The database decides who may react; these only describe what's there.

export const REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Funny" },
  { emoji: "😮", label: "Wow" },
  { emoji: "🎲", label: "Great roll" },
];

// One note's reactions, in the order above: { emoji, label, count, mine,
// names }. Only reactions someone actually gave are included. names lists who
// reacted ("You" for the person looking), oldest first.
export function summarizeReactions(reactions, entryId, userId) {
  const onNote = (reactions ?? []).filter((reaction) => reaction.entry_id === entryId);
  return REACTIONS.map(({ emoji, label }) => {
    const given = onNote
      .filter((reaction) => reaction.emoji === emoji)
      .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")));
    return {
      emoji,
      label,
      count: given.length,
      mine: given.some((reaction) => reaction.user_id === userId),
      names: given.map((reaction) => (reaction.user_id === userId ? "You" : reaction.reactor_name || "Someone")),
    };
  }).filter((summary) => summary.count > 0);
}

// The list with one reaction of this person's added or taken back, so a tap
// shows straight away while it saves.
export function toggleReaction(reactions, { entryId, emoji, userId }) {
  const list = reactions ?? [];
  const isMine = (reaction) => reaction.entry_id === entryId && reaction.emoji === emoji && reaction.user_id === userId;
  if (list.some(isMine)) return list.filter((reaction) => !isMine(reaction));
  return [...list, { entry_id: entryId, emoji, user_id: userId, reactor_name: "", created_at: new Date().toISOString() }];
}

// "Pippa, DM and 2 more" for a tooltip or a screen reader.
export function describeNames(names, shown = 3) {
  if (names.length <= shown) {
    return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  }
  return `${names.slice(0, shown).join(", ")} and ${names.length - shown} more`;
}

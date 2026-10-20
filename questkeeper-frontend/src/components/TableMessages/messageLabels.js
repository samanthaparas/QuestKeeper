// Names for the messages drawer: who a conversation is with, and who sent
// a message, from the table's people ({ userId, name, isDm }).

export function personName(people, userId, myId) {
  if (userId === myId) return "You";
  return people.find((person) => person.userId === userId)?.name ?? "Someone who left";
}

// "Everyone at the table", or the other people in it: "DM, Billie".
export function conversationTitle(conversation, people, myId) {
  if (conversation.everyone) return "Everyone at the table";
  const others = conversation.memberIds.filter((id) => id !== myId).map((id) => personName(people, id, myId));
  return others.length > 0 ? others.join(", ") : "Just you";
}

// ["Dangit"] -> "Dangit"; ["DM", "Rook"] -> "DM and Rook";
// ["DM", "Rook", "Wren"] -> "DM, Rook and Wren".
export function joinNames(names) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

// Who can read it, for the line under the title: "Only Dangit and you can
// see these messages."
export function whoCanSee(conversation, people, myId) {
  if (conversation.everyone) return "Everyone at this table can see these messages.";
  const others = conversation.memberIds.filter((id) => id !== myId).map((id) => personName(people, id, myId));
  if (others.length === 0) return "Only you can see these messages.";
  return `Only ${joinNames([...others, "you"])} can see these messages.`;
}

// "7:42 PM", or "Mon 7:42 PM" for an older one.
export function messageTime(iso, now = new Date()) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? time : `${date.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

// "Seen by" for a message I sent: who else in the conversation has read up
// to it (their last read is at or after it). people: everyone at the table
// [{ userId, name }]; in a whole-table conversation they're all in it, else
// only its members. Returns { text, seenAll } or null (nobody else is in it).
export function readReceipt(conversation, message, people, myId) {
  if (!conversation || !message) return null;
  const others = (conversation.everyone ? people.map((person) => person.userId) : conversation.memberIds ?? []).filter(
    (userId) => userId && userId !== myId,
  );
  if (others.length === 0) return null;
  const readAt = new Map((conversation.members ?? []).map((member) => [member.userId, member.lastReadAt]));
  const seen = others.filter((userId) => readAt.get(userId) && readAt.get(userId) >= message.created_at);
  const nameOf = (userId) => people.find((person) => person.userId === userId)?.name ?? "Someone";
  let text;
  if (seen.length === 0) text = "Not seen yet";
  else if (seen.length === others.length) text = others.length === 1 ? `Seen by ${nameOf(seen[0])}` : "Seen by everyone";
  else if (seen.length <= 2) text = `Seen by ${seen.map(nameOf).join(" and ")}`;
  else text = `Seen by ${seen.length} of ${others.length}`;
  return { text, seenAll: seen.length === others.length };
}

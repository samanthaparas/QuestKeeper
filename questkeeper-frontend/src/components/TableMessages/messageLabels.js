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

// Who can read it, for the line under the title.
export function whoCanSee(conversation, people, myId) {
  if (conversation.everyone) return "Everyone at this table can see these messages.";
  const names = conversation.memberIds.map((id) => personName(people, id, myId));
  return `Only ${names.join(", ")} can see these messages.`;
}

// "7:42 PM", or "Mon 7:42 PM" for an older one.
export function messageTime(iso, now = new Date()) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return sameDay ? time : `${date.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

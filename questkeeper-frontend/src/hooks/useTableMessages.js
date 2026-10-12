import { useCallback, useEffect, useState } from "react";
import { listConversations, listTablePeople, subscribeToMessages } from "../utils/messageStore";

// A backup check in case live updates drop (a phone waking from sleep).
const POLL_MS = 30000;

// Secret messages for one table: who can be messaged, my conversations with
// their unread counts, and the latest message that arrived from someone else
// (for a "new message" nudge). `version` goes up with every new message, so
// an open conversation knows to fetch again.
export function useTableMessages(tableId, myId) {
  const [people, setPeople] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!tableId || !myId) return;
    try {
      const [foundPeople, foundConversations] = await Promise.all([
        listTablePeople(tableId),
        listConversations(tableId, myId),
      ]);
      setPeople(foundPeople);
      setConversations(foundConversations);
      setError("");
    } catch {
      setError("Couldn't load messages right now.");
    }
  }, [tableId, myId]);

  useEffect(() => {
    if (!tableId || !myId) return undefined;
    let stopped = false;
    // The first load happens in a callback, not straight in the effect.
    const first = setTimeout(reload, 0);
    const timer = setInterval(reload, POLL_MS);
    // If live updates can't start, the regular check still brings messages in.
    let stopListening = () => {};
    try {
      stopListening = subscribeToMessages(tableId, (message) => {
        if (stopped) return;
        setVersion((value) => value + 1);
        if (message.sender_id !== myId) setIncoming(message);
        reload();
      });
    } catch {
      // Polling only.
    }
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
      stopListening();
    };
  }, [tableId, myId, reload]);

  const unreadTotal = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);

  return {
    people,
    conversations,
    unreadTotal,
    incoming,
    clearIncoming: () => setIncoming(null),
    version,
    error,
    reload,
  };
}

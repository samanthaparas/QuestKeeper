import { useCallback, useEffect, useState } from "react";
import {
  listConversations,
  listMyTables,
  listTablePeople,
  subscribeToMessages,
} from "../utils/messageStore";

// A backup check in case live updates drop (a phone waking from sleep).
const POLL_MS = 30000;

// Secret messages across every table I run or sit at: the tables, who can
// be messaged at each, my conversations with their unread counts, and the
// latest message that arrived from someone else (for a "new message"
// nudge). `version` goes up with every new message, so an open
// conversation knows to fetch again.
export function useMessages(myId) {
  const [tables, setTables] = useState([]);
  const [peopleByTable, setPeopleByTable] = useState({});
  const [conversations, setConversations] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  // True until the first load has finished (found or failed), so the drawer
  // can say "Loading" instead of "you have no tables".
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!myId) return;
    try {
      const [foundTables, foundConversations] = await Promise.all([
        listMyTables(),
        listConversations(null, myId),
      ]);
      const people = await Promise.all(
        foundTables.map((table) => listTablePeople(table.id).catch(() => [])),
      );
      setTables(foundTables);
      setPeopleByTable(Object.fromEntries(foundTables.map((table, index) => [table.id, people[index]])));
      setConversations(foundConversations);
      setError("");
    } catch {
      setError("Couldn't load messages right now.");
    } finally {
      setIsLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    if (!myId) return undefined;
    let stopped = false;
    // The first load happens in a callback, not straight in the effect.
    const first = setTimeout(reload, 0);
    const timer = setInterval(reload, POLL_MS);
    // If live updates can't start, the regular check still brings messages in.
    let stopListening = () => {};
    try {
      stopListening = subscribeToMessages((message) => {
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
  }, [myId, reload]);

  return {
    tables,
    peopleByTable,
    conversations,
    unreadTotal: conversations.reduce((sum, conversation) => sum + conversation.unread, 0),
    incoming,
    clearIncoming: () => setIncoming(null),
    version,
    error,
    isLoading,
    reload,
  };
}

import { supabase } from "./supabaseClient";

// Secret messages at a table. Supabase's row-level security decides who can
// read what (see supabase/migrations/20261012_table_messages.sql): only the
// people in a conversation ever receive its messages or pictures.

const BUCKET = "table-message-images";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
// How long a picture's private link works before it's fetched again.
const SIGNED_URL_SECONDS = 60 * 60;

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// Everyone who can be messaged at a table: the DM, and each seated player
// by their character's name. [{ userId, name, isDm }]
export async function listTablePeople(tableId) {
  const [table, players] = await Promise.all([
    supabase.from("game_tables").select("dm_id").eq("id", tableId).single().then(unwrap),
    supabase
      .from("combatants")
      .select("user_id, name")
      .eq("table_id", tableId)
      .eq("kind", "player")
      .then(unwrap),
  ]);
  return [
    { userId: table.dm_id, name: "DM", isDm: true },
    ...players.map((player) => ({ userId: player.user_id, name: player.name, isDm: false })),
  ];
}

// The conversations I can read at this table, newest first, with who's in
// each, the latest message, and how many I haven't read.
export async function listConversations(tableId, myId) {
  const conversations = unwrap(
    await supabase
      .from("table_conversations")
      .select("id, everyone, created_by, last_message_at, table_conversation_members(user_id, last_read_at)")
      .eq("table_id", tableId)
      .order("last_message_at", { ascending: false }),
  );
  if (conversations.length === 0) return [];

  const messages = unwrap(
    await supabase
      .from("table_messages")
      .select("id, conversation_id, sender_id, body, image_path, created_at")
      .eq("table_id", tableId)
      .order("created_at", { ascending: false })
      .limit(500),
  );

  return conversations.map((conversation) => {
    const members = conversation.table_conversation_members ?? [];
    const lastRead = members.find((member) => member.user_id === myId)?.last_read_at ?? "1970-01-01";
    const own = messages.filter((message) => message.conversation_id === conversation.id);
    return {
      id: conversation.id,
      everyone: conversation.everyone,
      memberIds: members.map((member) => member.user_id),
      lastMessage: own[0] ?? null,
      unread: own.filter((message) => message.sender_id !== myId && message.created_at > lastRead).length,
    };
  });
}

// Oldest first, for reading top to bottom.
export async function listMessages(conversationId) {
  return unwrap(
    await supabase
      .from("table_messages")
      .select("id, conversation_id, sender_id, body, image_path, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(300),
  );
}

// The conversation with the whole table, or with exactly these people (I'm
// always in it). Returns its id; the same group always gets the same one.
export async function startConversation(tableId, { everyone = false, userIds = [] }) {
  return unwrap(
    await supabase.rpc("start_conversation", {
      p_table_id: tableId,
      p_user_ids: everyone ? null : userIds,
      p_everyone: everyone,
    }),
  );
}

export async function sendMessage(conversationId, { body = "", imagePath = null }) {
  return unwrap(
    await supabase.rpc("send_table_message", {
      p_conversation_id: conversationId,
      p_body: body,
      p_image_path: imagePath,
    }),
  );
}

export async function markConversationRead(conversationId) {
  unwrap(await supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId }));
}

export function validateMessageImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return "Pictures can be PNG, JPG, WebP or GIF.";
  if (file.size > MAX_IMAGE_BYTES) return "Pictures must be smaller than 5 MB.";
  return null;
}

// Stores a picture privately for one conversation; returns its path.
export async function uploadMessageImage(conversationId, file) {
  const extension = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${conversationId}/${crypto.randomUUID()}.${extension}`;
  unwrap(await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type }));
  return path;
}

// A short-lived private link to a picture (only conversation members get one).
export async function getMessageImageUrl(path) {
  const data = unwrap(await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS));
  return data.signedUrl;
}

// Calls onMessage for each new message I'm allowed to read at this table.
// Returns a function that stops listening.
export function subscribeToMessages(tableId, onMessage) {
  const channel = supabase
    .channel(`messages-${tableId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "table_messages", filter: `table_id=eq.${tableId}` },
      (payload) => onMessage(payload.new),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

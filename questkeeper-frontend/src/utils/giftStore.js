// Giving items to another player at the same table (see
// 20261122_item_gifts.sql). A gift waits in the receiver's gift box until
// they take it on their own sheet; nobody's sheet is changed from outside.

import { supabase } from "./supabaseClient";

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// The gifts waiting for this character, and the ones it has sent that
// haven't been taken yet: { incoming, outgoing }.
export async function listGiftsFor(characterId) {
  const rows = unwrap(
    await supabase
      .from("item_gifts")
      .select("*")
      .or(`to_character_id.eq.${characterId},from_character_id.eq.${characterId}`)
      .order("created_at", { ascending: true }),
  );
  return {
    incoming: rows.filter((gift) => gift.to_character_id === characterId),
    outgoing: rows.filter((gift) => gift.from_character_id === characterId),
  };
}

// The other people seated at a table, to give to: [{ userId, name }].
export async function listGiftReceivers(tableId, myUserId) {
  const rows = unwrap(await supabase.rpc("get_table_member_portraits", { p_table_id: tableId })) ?? [];
  return rows
    .filter((row) => row.userId && row.userId !== myUserId)
    .map((row) => ({ userId: row.userId, name: typeof row.name === "string" && row.name ? row.name : "Adventurer" }));
}

export async function giveItem(tableId, toUserId, item) {
  return unwrap(await supabase.rpc("give_item", { p_table_id: tableId, p_to_user: toUserId, p_item: item }));
}

// Each returns the item's details, to add to this character's Inventory.
export async function takeGift(giftId) {
  return unwrap(await supabase.rpc("take_gift", { p_gift_id: giftId }));
}

export async function cancelGift(giftId) {
  return unwrap(await supabase.rpc("cancel_gift", { p_gift_id: giftId }));
}

export async function returnGift(giftId) {
  unwrap(await supabase.rpc("return_gift", { p_gift_id: giftId }));
}

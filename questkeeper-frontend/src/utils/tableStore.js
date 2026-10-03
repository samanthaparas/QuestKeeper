import { supabase } from "./supabaseClient";
import { getNextTurn } from "./initiative";

// All table (group) data lives in Supabase. Row-level security decides who may
// see or change what; see supabase/migrations/20261003_dm_tables.sql.

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// --- Tables -----------------------------------------------------------------

export async function createTable(name) {
  return unwrap(
    await supabase
      .from("game_tables")
      .insert({ name: name.trim() })
      .select()
      .single(),
  );
}

// Every table the signed-in user runs or has joined.
export async function listMyTables() {
  return unwrap(
    await supabase
      .from("game_tables")
      .select("*")
      .order("created_at", { ascending: false }),
  );
}

export async function getTable(id) {
  return unwrap(
    await supabase.from("game_tables").select("*").eq("id", id).maybeSingle(),
  );
}

export async function deleteTable(id) {
  unwrap(await supabase.from("game_tables").delete().eq("id", id));
}

// --- Players ----------------------------------------------------------------

export async function joinTable(code, characterId) {
  return unwrap(
    await supabase.rpc("join_table", {
      p_code: code,
      p_character_id: characterId,
    }),
  );
}

export async function leaveTable(tableId) {
  unwrap(await supabase.rpc("leave_table", { p_table_id: tableId }));
}

export async function removeMember(tableId, userId) {
  unwrap(
    await supabase.rpc("remove_member", {
      p_table_id: tableId,
      p_user_id: userId,
    }),
  );
}

export async function listMembers(tableId) {
  return unwrap(
    await supabase.from("table_members").select("*").eq("table_id", tableId),
  );
}

// --- Combat -----------------------------------------------------------------

export async function listCombatants(tableId) {
  return unwrap(
    await supabase
      .from("combatants")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at", { ascending: true }),
  );
}

// DM only: real enemy HP, keyed by combatant id. Returns {} for anyone else
// (row-level security hides these rows from players).
export async function listEnemyHp(combatantIds) {
  if (combatantIds.length === 0) return {};

  const rows = unwrap(
    await supabase
      .from("combatant_secrets")
      .select("*")
      .in("combatant_id", combatantIds),
  );

  return Object.fromEntries(rows.map((row) => [row.combatant_id, row]));
}

export async function setMyInitiative(tableId, initiative) {
  unwrap(
    await supabase.rpc("set_my_initiative", {
      p_table_id: tableId,
      p_initiative: initiative,
    }),
  );
}

export async function setCombatantInitiative(combatantId, initiative) {
  unwrap(
    await supabase
      .from("combatants")
      .update({ initiative })
      .eq("id", combatantId),
  );
}

// armorClass is secret: only the DM can ever read it back.
export async function addMonster(
  tableId,
  name,
  maxHp,
  initiative = null,
  armorClass = null,
) {
  return unwrap(
    await supabase.rpc("add_monster", {
      p_table_id: tableId,
      p_name: name,
      p_max_hp: maxHp,
      p_initiative: initiative,
      p_armor_class: armorClass,
    }),
  );
}

// --- Attacks, damage, and the activity log ----------------------------------

// Newest first.
export async function listEvents(tableId, limit = 30) {
  return unwrap(
    await supabase
      .from("table_events")
      .select("*")
      .eq("table_id", tableId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

// `natural` is the d20 as rolled; `bonus` is the attack's to-hit modifier.
// Returns "hit", "crit", "miss", or "awaiting" (the DM must call it).
export async function attackRoll({ tableId, targetId, attackName, natural, bonus }) {
  return unwrap(
    await supabase.rpc("attack_roll", {
      p_table_id: tableId,
      p_target_id: targetId,
      p_attack_name: attackName,
      p_natural: natural,
      p_bonus: bonus,
    }),
  );
}

export async function dealDamage(tableId, amount) {
  unwrap(
    await supabase.rpc("deal_damage", { p_table_id: tableId, p_amount: amount }),
  );
}

export async function dmResolveAttack(attackerId, hit) {
  unwrap(
    await supabase.rpc("dm_resolve_attack", {
      p_attacker_id: attackerId,
      p_hit: hit,
    }),
  );
}

// The DM rolls for an enemy attacking a player. `natural` is the d20; the
// server compares it to the player's AC. Returns { result, ac } where result is
// "hit", "crit", or "miss".
export async function monsterAttackRoll({ attackerId, targetUserId, attackName, natural, bonus }) {
  return unwrap(
    await supabase.rpc("monster_attack_roll", {
      p_attacker_id: attackerId,
      p_target_user_id: targetUserId,
      p_attack_name: attackName,
      p_natural: natural,
      p_bonus: bonus,
    }),
  );
}

// --- DM toolkit: monsters, allies, stat blocks ------------------------------

// kind is "monster" (an enemy) or "ally" (a friendly NPC, or a party member the
// DM tracks by hand). The stat block ({ attacks: [{ name, toHit, damage }],
// notes }) and AC/HP stay hidden from players.
export async function addCombatant({
  tableId,
  name,
  maxHp,
  kind = "monster",
  initiative = null,
  armorClass = null,
  statBlock = {},
}) {
  return unwrap(
    await supabase.rpc("add_combatant", {
      p_table_id: tableId,
      p_name: name,
      p_max_hp: maxHp,
      p_kind: kind,
      p_initiative: initiative,
      p_armor_class: armorClass,
      p_stat_block: statBlock,
    }),
  );
}

export async function editCombatant({ id, name, maxHp, currentHp, armorClass, statBlock = null }) {
  unwrap(
    await supabase.rpc("edit_combatant", {
      p_combatant_id: id,
      p_name: name,
      p_max_hp: maxHp,
      p_current_hp: currentHp,
      p_armor_class: armorClass,
      p_stat_block: statBlock,
    }),
  );
}

// A free-form line in the activity log from the DM.
export async function dmLog(tableId, message) {
  unwrap(await supabase.rpc("dm_log", { p_table_id: tableId, p_message: message }));
}

// Any monster or ally attacks any other fighter. Returns { result, ac } where
// result is "hit", "crit", "miss", or "unknown" (the target has no AC on file,
// so the DM calls it). ac is only given when the target is a player.
export async function dmAttackRoll({ attackerId, targetId, attackName, natural, bonus }) {
  return unwrap(
    await supabase.rpc("dm_attack_roll", {
      p_attacker_id: attackerId,
      p_target_id: targetId,
      p_attack_name: attackName,
      p_natural: natural,
      p_bonus: bonus,
    }),
  );
}

// A player passes the turn to the next fighter in the initiative order.
export async function endMyTurn(tableId) {
  unwrap(await supabase.rpc("end_my_turn", { p_table_id: tableId }));
}

// --- Monster library (each user's own saved monsters and NPCs) ---------------

export async function listTemplates() {
  return unwrap(
    await supabase
      .from("monster_templates")
      .select("*")
      .order("name", { ascending: true }),
  );
}

export async function createTemplate({ name, kind, maxHp, armorClass, statBlock }) {
  return unwrap(
    await supabase
      .from("monster_templates")
      .insert({
        name: name.trim(),
        kind,
        max_hp: maxHp,
        armor_class: armorClass,
        stat_block: statBlock,
      })
      .select()
      .single(),
  );
}

export async function updateTemplate(id, { name, kind, maxHp, armorClass, statBlock }) {
  return unwrap(
    await supabase
      .from("monster_templates")
      .update({
        name: name.trim(),
        kind,
        max_hp: maxHp,
        armor_class: armorClass,
        stat_block: statBlock,
      })
      .eq("id", id)
      .select()
      .single(),
  );
}

export async function deleteTemplate(id) {
  unwrap(await supabase.from("monster_templates").delete().eq("id", id));
}

// Cancels a player's latest attack; any damage it dealt is put back.
export async function dmDenyAttack(attackerId) {
  unwrap(
    await supabase.rpc("dm_deny_attack", { p_attacker_id: attackerId }),
  );
}

export async function postPlayerDamage(tableId, targetUserId, amount, source) {
  unwrap(
    await supabase.rpc("post_player_damage", {
      p_table_id: tableId,
      p_target_user_id: targetUserId,
      p_amount: amount,
      p_source: source,
    }),
  );
}

export async function listMyDamageRequests(tableId, userId) {
  return unwrap(
    await supabase
      .from("damage_requests")
      .select("*")
      .eq("table_id", tableId)
      .eq("target_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  );
}

// Returns the amount, so the caller can apply it to the character sheet.
export async function resolveDamageRequest(requestId, apply) {
  return unwrap(
    await supabase.rpc("resolve_damage_request", {
      p_request_id: requestId,
      p_apply: apply,
    }),
  );
}

// Positive = damage, negative = healing.
export async function applyDamage(combatantId, amount) {
  unwrap(
    await supabase.rpc("apply_damage", {
      p_combatant_id: combatantId,
      p_amount: amount,
    }),
  );
}

export async function removeCombatant(combatantId) {
  unwrap(await supabase.from("combatants").delete().eq("id", combatantId));
}

async function updateTable(tableId, patch) {
  unwrap(await supabase.from("game_tables").update(patch).eq("id", tableId));
}

export async function startCombat(tableId, combatants) {
  const { currentId, round } = getNextTurn(combatants, null, 1);
  await updateTable(tableId, {
    combat_active: true,
    round,
    current_combatant_id: currentId,
  });
}

export async function advanceTurn(table, combatants) {
  const { currentId, round } = getNextTurn(
    combatants,
    table.current_combatant_id,
    table.round,
  );
  await updateTable(table.id, { round, current_combatant_id: currentId });
}

export async function endCombat(tableId) {
  await updateTable(tableId, {
    combat_active: false,
    round: 1,
    current_combatant_id: null,
  });
}

// Clears monsters and everyone's initiative, ready for the next encounter.
export async function resetEncounter(tableId) {
  await endCombat(tableId);
  unwrap(
    await supabase
      .from("combatants")
      .delete()
      .eq("table_id", tableId)
      .eq("kind", "monster"),
  );
  unwrap(
    await supabase
      .from("combatants")
      .update({ initiative: null })
      .eq("table_id", tableId),
  );
}

// --- Live updates -----------------------------------------------------------

// Calls onChange whenever the table, its members, or its combatants change.
// Returns a function that stops listening. combatant_secrets is never
// broadcast, so enemy HP is refetched by the DM's page instead.
export function subscribeToTable(tableId, onChange) {
  const channel = supabase
    .channel(`table-${tableId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "game_tables", filter: `id=eq.${tableId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "combatants", filter: `table_id=eq.${tableId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_members", filter: `table_id=eq.${tableId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "table_events", filter: `table_id=eq.${tableId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "damage_requests", filter: `table_id=eq.${tableId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// A character can sit at several tables. Newest join comes first, unless the
// player picked a different table to follow. `recencyIds` lists table ids from
// newest membership to oldest.
export function pickActiveTable(tables, recencyIds, preferredTableId = null) {
  const sorted = [...tables].sort(
    (a, b) => recencyIds.indexOf(a.id) - recencyIds.indexOf(b.id),
  );
  const table = sorted.find((candidate) => candidate.id === preferredTableId) ?? sorted[0];
  return { table, sorted };
}

// The table this character is playing at, if a fight is running. Used by the
// turn banner on a player's own character sheet.
export async function getActiveCombatForCharacter(
  characterId,
  userId,
  preferredTableId = null,
) {
  const memberships = unwrap(
    await supabase
      .from("table_members")
      .select("table_id, joined_at")
      .eq("character_id", characterId)
      .order("joined_at", { ascending: false }),
  );

  if (memberships.length === 0) return null;

  const tables = unwrap(
    await supabase
      .from("game_tables")
      .select("*")
      .in(
        "id",
        memberships.map((membership) => membership.table_id),
      )
      .eq("combat_active", true),
  );

  if (tables.length === 0) return null;

  const { table, sorted } = pickActiveTable(
    tables,
    memberships.map((membership) => membership.table_id),
    preferredTableId,
  );

  const [combatants, events, damageRequests] = await Promise.all([
    listCombatants(table.id),
    listEvents(table.id, 5),
    userId ? listMyDamageRequests(table.id, userId) : [],
  ]);

  return {
    table,
    combatants,
    events,
    damageRequests,
    activeTables: sorted.map((entry) => ({ id: entry.id, name: entry.name })),
  };
}

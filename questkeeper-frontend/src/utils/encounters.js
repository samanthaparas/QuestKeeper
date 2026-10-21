// The encounter helper's maths: how hard a set of monsters is for a party,
// and a suggested set for a chosen difficulty. This is the 2014 rules' XP
// method (the free SRD 5.1 monsters carry the XP and challenge rating it
// needs). The numbers are a guide for the DM, never a rule: a fight is as
// hard as the table makes it.

export const DIFFICULTIES = ["easy", "medium", "hard", "deadly"];
export const DIFFICULTY_LABELS = { trivial: "Trivial", easy: "Easy", medium: "Medium", hard: "Hard", deadly: "Deadly" };

// XP a character of each level adds to the party's budget: [easy, medium, hard, deadly].
const XP_THRESHOLDS = {
  1: [25, 50, 75, 100],
  2: [50, 100, 150, 200],
  3: [75, 150, 225, 400],
  4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100],
  6: [300, 600, 900, 1400],
  7: [350, 750, 1100, 1700],
  8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
};

const clampLevel = (level) => Math.max(1, Math.min(20, Math.round(Number(level) || 1)));

// The party's XP budget for each difficulty.
export function partyThresholds(levels) {
  const totals = [0, 0, 0, 0];
  levels.forEach((level) => {
    XP_THRESHOLDS[clampLevel(level)].forEach((xp, index) => {
      totals[index] += xp;
    });
  });
  return { easy: totals[0], medium: totals[1], hard: totals[2], deadly: totals[3] };
}

// More monsters hit harder together than their XP adds up to. Small parties
// feel that more, big ones less: one step up the ladder for fewer than 3
// players, one step down for 6 or more.
const MULTIPLIERS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

export function encounterMultiplier(monsterCount, partySize) {
  let step;
  if (monsterCount <= 1) step = 1;
  else if (monsterCount === 2) step = 2;
  else if (monsterCount <= 6) step = 3;
  else if (monsterCount <= 10) step = 4;
  else if (monsterCount <= 14) step = 5;
  else step = 6;
  if (partySize < 3) step += 1;
  else if (partySize >= 6) step -= 1;
  return MULTIPLIERS[Math.max(0, Math.min(MULTIPLIERS.length - 1, step))];
}

// How hard `entries` ([{ monster: { xp }, count }]) is for a party of these
// levels. difficulty is "trivial" under Easy, else the highest bar reached.
export function rateEncounter(entries, levels) {
  const count = entries.reduce((sum, entry) => sum + entry.count, 0);
  const baseXp = entries.reduce((sum, entry) => sum + (Number(entry.monster.xp) || 0) * entry.count, 0);
  const multiplier = count === 0 ? 1 : encounterMultiplier(count, levels.length);
  const adjustedXp = Math.round(baseXp * multiplier);
  const thresholds = partyThresholds(levels);
  let difficulty = "trivial";
  DIFFICULTIES.forEach((name) => {
    if (adjustedXp >= thresholds[name]) difficulty = name;
  });
  return { count, baseXp, multiplier, adjustedXp, thresholds, difficulty };
}

// "1/4" for 0.25 and so on.
export function formatChallenge(rating) {
  const value = Number(rating);
  if (value === 0.125) return "1/8";
  if (value === 0.25) return "1/4";
  if (value === 0.5) return "1/2";
  return String(value);
}

// A suggested fight for a difficulty: tries random mixes of one or two kinds
// of monster until one lands in that difficulty. theme limits the monster
// type ("undead"); "" means anything. random is injectable for tests.
// Returns [{ monster, count }] or null if nothing fits.
export function suggestEncounter({ levels, difficulty, monsters, theme = "", random = Math.random }) {
  if (levels.length === 0 || !DIFFICULTIES.includes(difficulty)) return null;
  const budget = partyThresholds(levels)[difficulty];
  const pool = monsters.filter(
    (monster) =>
      monster.xp > 0 &&
      monster.xp <= budget &&
      (!theme || String(monster.type).startsWith(theme)),
  );
  if (pool.length === 0) return null;

  const pick = (list) => list[Math.floor(random() * list.length)];
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const first = pick(pool);
    const entries = [{ monster: first, count: 1 + Math.floor(random() * 6) }];
    // Half the time, a second kind (a leader with followers, say).
    if (random() < 0.5) {
      const second = pick(pool);
      if (second.index !== first.index) entries.push({ monster: second, count: 1 + Math.floor(random() * 3) });
    }
    if (rateEncounter(entries, levels).difficulty === difficulty) return entries;
  }
  return null;
}

// --- From an SRD monster to a combatant -------------------------------------

const ABILITY_KEYS = {
  STR: "strength",
  DEX: "dexterity",
  CON: "constitution",
  INT: "intelligence",
  WIS: "wisdom",
  CHA: "charisma",
};

const modifier = (score) => Math.floor(((Number(score) || 10) - 10) / 2);

// What the table's add-monster form wants, from an SRD monster's full entry:
// name, hit points, AC and a stat block (attacks with to-hit and damage dice,
// saves, initiative). Only the DM ever sees the stat block.
export function combatantFromMonster(detail) {
  const attacks = (detail.actions ?? [])
    .filter((action) => typeof action.attack_bonus === "number" && action.damage?.[0]?.damage_dice)
    .map((action) => ({
      name: action.name,
      toHit: action.attack_bonus,
      damage: String(action.damage[0].damage_dice).replace(/\s+/g, ""),
    }));

  const saves = {};
  (detail.proficiencies ?? []).forEach((entry) => {
    const match = /^Saving Throw: (\w{3})$/.exec(entry.proficiency?.name ?? "");
    if (match && ABILITY_KEYS[match[1]]) saves[ABILITY_KEYS[match[1]]] = entry.value;
  });

  const abilities = (detail.special_abilities ?? []).map((ability) => ability.name);
  const note = [
    `CR ${formatChallenge(detail.challenge_rating)} ${String(detail.size ?? "").toLowerCase()} ${detail.type ?? ""}`.trim(),
    abilities.length > 0 ? `Traits: ${abilities.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const initiativeBonus = modifier(detail.dexterity);
  return {
    name: detail.name,
    maxHp: detail.hit_points,
    armorClass: detail.armor_class?.[0]?.value ?? null,
    statBlock: {
      attacks,
      notes: note,
      ...(initiativeBonus ? { initiativeBonus } : {}),
      ...(Object.keys(saves).length > 0 ? { saves } : {}),
    },
  };
}

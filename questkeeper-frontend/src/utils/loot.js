// The loot helper's ideas: coins, a magic item, and a small hoard, scaled to
// the party's level and how hard the fight was. These are suggestions to
// spark the DM's own choices, never a rule: every amount and list here is
// QuestKeeper's own rough scale, and the DM keeps what they like. random is
// injectable so the tests can pin it down.

// Party tiers: 1st to 4th level, 5th to 10th, 11th to 16th, 17th to 20th.
export function tierOf(level) {
  const value = Number(level) || 1;
  if (value <= 4) return 1;
  if (value <= 10) return 2;
  if (value <= 16) return 3;
  return 4;
}

// About how much gold one ordinary fight leaves behind, by tier, and how a
// harder fight scales it.
const COIN_BASE_GP = { 1: 30, 2: 200, 3: 1200, 4: 6000 };
const FIGHT_FACTOR = { easy: 0.5, medium: 1, hard: 1.5, deadly: 2.5 };

const whole = (value) => Math.max(1, Math.round(value));
const between = (random, low, high) => low + random() * (high - low);

// "132 gp, 14 sp and 37 cp"
export function describeCoins({ gp, sp, cp }) {
  const parts = [gp > 0 && `${gp} gp`, sp > 0 && `${sp} sp`, cp > 0 && `${cp} cp`].filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "no coins";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

// A purse for one fight (or, with size 4, a hoard's worth).
export function rollCoins({ level, fight = "medium", size = 1, random = Math.random }) {
  const tier = tierOf(level);
  const gp = whole(COIN_BASE_GP[tier] * (FIGHT_FACTOR[fight] ?? 1) * size * between(random, 0.6, 1.4));
  const sp = Math.floor(random() * 20 * tier * Math.min(size, 2));
  const cp = Math.floor(random() * 60);
  return { gp, sp, cp, text: describeCoins({ gp, sp, cp }) };
}

// --- A magic item ------------------------------------------------------------

const RARITY_STEPS = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];

// How likely each rarity is at each tier (percent).
const RARITY_WEIGHTS = {
  1: { Common: 55, Uncommon: 40, Rare: 5 },
  2: { Uncommon: 45, Rare: 45, "Very Rare": 10 },
  3: { Uncommon: 10, Rare: 45, "Very Rare": 40, Legendary: 5 },
  4: { Rare: 15, "Very Rare": 55, Legendary: 30 },
};

function pickRarity(tier, fight, random) {
  const weights = Object.entries(RARITY_WEIGHTS[tier]);
  let roll = random() * weights.reduce((sum, [, weight]) => sum + weight, 0);
  let chosen = weights[weights.length - 1][0];
  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll < 0) {
      chosen = rarity;
      break;
    }
  }
  // A harder fight sometimes pays a step better; an easy one a step worse.
  const bump = fight === "hard" || fight === "deadly" ? 1 : fight === "easy" ? -1 : 0;
  if (bump !== 0 && random() < 0.3) {
    const index = RARITY_STEPS.indexOf(chosen) + bump;
    chosen = RARITY_STEPS[Math.max(0, Math.min(RARITY_STEPS.length - 1, index))];
  }
  return chosen;
}

// One magic item from the catalog ([{ name, rarities, consumable, ... }]),
// or null if nothing in that rarity fits. consumablesOnly: potions, scrolls
// and the like.
export function rollItem({ level, fight = "medium", catalog, consumablesOnly = false, random = Math.random }) {
  const usable = catalog.filter(
    (item) => (item.rarities ?? []).length > 0 && !item.rarities.every((rarity) => rarity === "Artifact") && (!consumablesOnly || item.consumable),
  );
  if (usable.length === 0) return null;

  const wanted = pickRarity(tierOf(level), fight, random);
  // Try the chosen rarity, then the nearest ones, so a thin list still answers.
  const order = [...RARITY_STEPS].sort(
    (a, b) => Math.abs(RARITY_STEPS.indexOf(a) - RARITY_STEPS.indexOf(wanted)) - Math.abs(RARITY_STEPS.indexOf(b) - RARITY_STEPS.indexOf(wanted)),
  );
  for (const rarity of order) {
    const matches = usable.filter((item) => item.rarities.includes(rarity));
    if (matches.length > 0) {
      return { item: matches[Math.floor(random() * matches.length)], rarity };
    }
  }
  return null;
}

// --- Valuables: gems and art ----------------------------------------------------

const GEMS = [
  [10, ["a chip of polished obsidian", "a small turquoise", "a banded agate", "a smooth piece of lapis"]],
  [50, ["a clear quartz crystal", "a deep red carnelian", "a moonstone", "a small citrine"]],
  [100, ["a perfect freshwater pearl", "a faceted amethyst", "a piece of carved jade", "a garnet"]],
  [500, ["a flawless aquamarine", "a green peridot", "a golden topaz", "a black pearl"]],
  [1000, ["a fire opal", "a blue sapphire", "a clear emerald", "a star ruby"]],
  [5000, ["a flawless diamond", "a blood-red ruby", "a large jacinth"]],
];

const ART = [
  [25, ["a silver ring set with a tiny stone", "a carved bone flute", "a brass-bound traveller's mirror", "a hand-painted fan"]],
  [100, ["a gilded comb", "a small silver statue of a hound", "an embroidered tapestry panel", "a jewelled hair pin"]],
  [250, ["a gold locket with a hidden portrait", "an ornate silver goblet", "a carved ivory chess piece set", "a velvet-lined jewellery case"]],
  [750, ["a gold-and-pearl choker", "a bronze mask inlaid with silver", "a jewelled ceremonial dagger"]],
  [2500, ["a jewelled gold crown", "a platinum bracelet set with sapphires", "a gold music box with a tiny orchestra"]],
];

// Which rows of the lists a tier draws from.
const VALUABLE_ROWS = { 1: [0, 2], 2: [1, 4], 3: [2, 5], 4: [3, 6] };

// A gem or an art object: { text: "a garnet (100 gp)", value }.
export function rollValuable({ level, random = Math.random }) {
  const [from, to] = VALUABLE_ROWS[tierOf(level)];
  const useGem = random() < 0.5;
  const list = useGem ? GEMS : ART;
  const row = list[Math.min(list.length - 1, Math.floor(between(random, from, to)))];
  const [value, names] = row;
  const name = names[Math.floor(random() * names.length)];
  return { value, text: `${name} (${value} gp)` };
}

// --- A small hoard -------------------------------------------------------------

// Bigger coins, a few valuables and maybe an item or two.
export function rollHoard({ level, fight = "medium", catalog = [], random = Math.random }) {
  const coins = rollCoins({ level, fight, size: 4, random });
  const valuables = Array.from({ length: 1 + Math.floor(random() * 3) }, () => rollValuable({ level, random }));
  const items = [];
  const itemCount = random() < 0.25 ? 2 : random() < 0.65 ? 1 : 0;
  for (let count = 0; count < itemCount; count += 1) {
    const found = rollItem({ level, fight, catalog, random });
    if (found && !items.some((entry) => entry.item.index === found.item.index)) items.push(found);
  }
  return { coins, valuables, items };
}


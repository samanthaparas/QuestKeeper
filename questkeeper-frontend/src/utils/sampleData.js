// Made-up sample data for the "see before you sign up" previews: one sample
// character and one sample DM table. Nothing here belongs to anyone, comes
// from an account, or is ever saved anywhere. The preview pages only read
// these objects; they never call Supabase or the rules server.
//
// The rules bits (Sneak Attack, Cunning Action, Bless, a Goblin's numbers)
// are SRD 5.1 content, described in our own short words.

export const SAMPLE_CHARACTER = {
  name: "Wren Thistledown",
  level: 3,
  race: "Halfling (Lightfoot)",
  className: "Rogue",
  subclass: "Thief",
  background: "Criminal",
  // 8 + 5 + 5 from her d8 Hit Dice, plus +2 Constitution a level.
  hitPoints: { current: 19, max: 24 },
  armorClass: 14,
  initiative: 3,
  speed: 25,
  proficiency: 2,
  abilities: [
    { key: "STR", score: 8, mod: -1 },
    { key: "DEX", score: 16, mod: 3 },
    { key: "CON", score: 14, mod: 2 },
    { key: "INT", score: 12, mod: 1 },
    { key: "WIS", score: 10, mod: 0 },
    { key: "CHA", score: 14, mod: 2 },
  ],
  // The skills she's best at (expertise doubles the proficiency bonus).
  skills: [
    { name: "Stealth", bonus: 7, note: "Expertise" },
    { name: "Sleight of Hand", bonus: 7, note: "Expertise" },
    { name: "Perception", bonus: 2, note: "Proficient" },
    { name: "Deception", bonus: 4, note: "Proficient" },
  ],
  attacks: [
    { name: "Shortsword", toHit: 5, damage: "1d6+3", type: "piercing" },
    { name: "Shortbow", toHit: 5, damage: "1d6+3", type: "piercing", note: "Range 80/320 ft" },
  ],
  features: [
    { name: "Sneak Attack (2d6)", text: "Once a turn, extra damage when you have advantage or an ally is next to the target." },
    { name: "Cunning Action", text: "Dash, Disengage or Hide as a bonus action." },
    { name: "Fast Hands", text: "Use an object or Sleight of Hand as a bonus action." },
    { name: "Lucky", text: "Reroll a 1 on an attack, check or save (a halfling trait)." },
  ],
  resources: [{ name: "Hit Dice (d8)", current: 3, max: 3, refills: "Long rest" }],
  conditions: ["Poisoned (2 rounds left)"],
  inventory: ["Shortsword", "Shortbow and 20 arrows", "Leather armor", "Thieves' tools", "Burglar's pack", "A forged ring of an old lord"],
};

// A guided snapshot of a DM's table mid-fight. It's a picture, not a game:
// nothing can be sent, rolled for real, or joined from it.
export const SAMPLE_TABLE = {
  name: "The Goblin Ambush",
  round: 2,
  turnOrder: [
    { name: "Wren Thistledown", kind: "player", initiative: 18 },
    { name: "Goblin 1", kind: "monster", initiative: 15, current: true },
    { name: "Brother Aldric", kind: "player", initiative: 12 },
    { name: "Goblin 2", kind: "monster", initiative: 9 },
    { name: "Bugbear", kind: "monster", initiative: 6 },
  ],
  party: [
    {
      name: "Wren Thistledown",
      summary: "Level 3 Rogue",
      hp: { current: 19, max: 24 },
      health: "Healthy",
      armorClass: 14,
      conditions: ["Poisoned"],
    },
    {
      name: "Brother Aldric",
      summary: "Level 3 Cleric",
      hp: { current: 9, max: 24 },
      health: "Bloodied",
      armorClass: 18,
      concentration: "Bless",
    },
  ],
  // What only the DM sees.
  monsters: [
    { name: "Goblin 1", hp: { current: 7, max: 7 }, armorClass: 15, status: "Healthy", attack: "Scimitar +4, 1d6+2 slashing" },
    { name: "Goblin 2", hp: { current: 0, max: 7 }, armorClass: 15, status: "Down", attack: "Shortbow +4, 1d6+2 piercing" },
    { name: "Bugbear", hp: { current: 20, max: 27 }, armorClass: 16, status: "Healthy", attack: "Morningstar +4, 2d8+2 piercing" },
  ],
  log: [
    "Round 2 begins.",
    "Wren Thistledown attacks Goblin 2 with Shortbow: hit.",
    "Wren Thistledown deals 11 damage to Goblin 2. Goblin 2 is down!",
    "It's Goblin 1's turn.",
  ],
};

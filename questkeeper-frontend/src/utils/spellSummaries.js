// One-line plain-language summaries for every spell a new character can pick
// at creation (cantrips and 1st-level spells on the SRD class lists), so a
// beginner can tell Fire Bolt from Guidance without opening another tab.
// The full SRD text is one click away ("Read more"); these are just a taste.
//
// `tag` groups spells by what they are for: Damage, Healing, Buff, Defense,
// Control, Social or Utility.

export const SPELL_SUMMARIES = {
  // Cantrips
  "acid-splash": {
    tag: "Damage",
    text: "Lob acid at one or two nearby foes (Dex save, 1d6).",
  },
  "chill-touch": {
    tag: "Damage",
    text: "Ranged necrotic attack (1d8) that also stops the target healing for a turn.",
  },
  "dancing-lights": {
    tag: "Utility",
    text: "Make four floating lights you can move around.",
  },
  druidcraft: {
    tag: "Utility",
    text: "Tiny nature tricks: predict weather, bloom a flower, snuff or light a candle.",
  },
  "eldritch-blast": {
    tag: "Damage",
    text: "Ranged force beam (1d10). Gains extra beams as you level.",
  },
  "fire-bolt": {
    tag: "Damage",
    text: "Ranged fire attack (1d10) that can set objects alight.",
  },
  guidance: { tag: "Buff", text: "An ally adds a d4 to one ability check." },
  light: { tag: "Utility", text: "Make an object glow like a torch." },
  "mage-hand": {
    tag: "Utility",
    text: "A floating hand that carries small things and opens doors.",
  },
  mending: {
    tag: "Utility",
    text: "Repair a small break or tear in an object.",
  },
  message: {
    tag: "Utility",
    text: "Whisper to someone far away; only they hear it.",
  },
  "minor-illusion": {
    tag: "Utility",
    text: "Create a small sound or picture to fool others.",
  },
  "poison-spray": {
    tag: "Damage",
    text: "Short-range poison cloud (Con save, 1d12).",
  },
  prestidigitation: {
    tag: "Utility",
    text: "Small harmless tricks: clean, warm, flavor or mark things.",
  },
  "produce-flame": {
    tag: "Damage",
    text: "A flame in your hand that lights the way, or hurl it (1d8 fire).",
  },
  "ray-of-frost": {
    tag: "Damage",
    text: "Ranged cold attack (1d8) that slows the target a little.",
  },
  resistance: { tag: "Buff", text: "An ally adds a d4 to one saving throw." },
  "sacred-flame": {
    tag: "Damage",
    text: "Radiant flame (Dex save, 1d8) that ignores cover.",
  },
  shillelagh: {
    tag: "Buff",
    text: "Your club or staff hits with your casting ability and deals a d8.",
  },
  "shocking-grasp": {
    tag: "Damage",
    text: "Touch attack (1d8 lightning), good against metal armor, stops the target reacting.",
  },
  "spare-the-dying": {
    tag: "Healing",
    text: "Stabilize a dying creature at 0 hit points.",
  },
  thaumaturgy: {
    tag: "Utility",
    text: "Minor wonders: a booming voice, flickering flames, a shaking floor.",
  },
  "true-strike": {
    tag: "Buff",
    text: "Gain advantage on your next attack against a target.",
  },
  "vicious-mockery": {
    tag: "Damage",
    text: "Insult a foe (Wis save, 1d4 psychic) and weaken its next attack.",
  },

  // 1st-level spells
  alarm: {
    tag: "Utility",
    text: "Set an alert for when something enters an area.",
  },
  "animal-friendship": {
    tag: "Social",
    text: "Calm a beast so it won't harm you.",
  },
  bane: {
    tag: "Control",
    text: "Up to three foes subtract a d4 from attacks and saves (Cha save).",
  },
  bless: {
    tag: "Buff",
    text: "Up to three allies add a d4 to attacks and saves.",
  },
  "burning-hands": {
    tag: "Damage",
    text: "A 15-foot cone of fire (Dex save, 3d6).",
  },
  "charm-person": {
    tag: "Social",
    text: "Make a humanoid friendly toward you for an hour (Wis save).",
  },
  "color-spray": {
    tag: "Control",
    text: "Blind weak creatures in a cone, weakest first.",
  },
  command: {
    tag: "Control",
    text: "Give a one-word order a creature follows next turn (Wis save).",
  },
  "comprehend-languages": {
    tag: "Utility",
    text: "Understand any spoken or written language for an hour.",
  },
  "create-or-destroy-water": {
    tag: "Utility",
    text: "Create or remove up to 10 gallons of water.",
  },
  "cure-wounds": {
    tag: "Healing",
    text: "A touch heals 1d8 plus your casting modifier.",
  },
  "detect-evil-and-good": {
    tag: "Utility",
    text: "Sense nearby celestials, fiends, undead and similar.",
  },
  "detect-magic": {
    tag: "Utility",
    text: "Sense magic nearby and see its aura.",
  },
  "detect-poison-and-disease": {
    tag: "Utility",
    text: "Sense poisons and diseases nearby.",
  },
  "disguise-self": {
    tag: "Social",
    text: "Change your appearance for an hour.",
  },
  entangle: {
    tag: "Control",
    text: "Vines grab creatures in an area (Str save) and slow movement.",
  },
  "expeditious-retreat": {
    tag: "Buff",
    text: "Dash as a bonus action each turn.",
  },
  "faerie-fire": {
    tag: "Control",
    text: "Outline enemies in light so attacks against them have advantage.",
  },
  "false-life": {
    tag: "Defense",
    text: "Gain some temporary hit points (1d4 + 4).",
  },
  "feather-fall": {
    tag: "Defense",
    text: "Slow falling creatures so they take no fall damage.",
  },
  "find-familiar": {
    tag: "Utility",
    text: "Gain a small animal spirit that scouts and helps.",
  },
  "floating-disk": {
    tag: "Utility",
    text: "A floating platform that carries heavy loads.",
  },
  "fog-cloud": { tag: "Control", text: "A sphere of fog that blocks sight." },
  goodberry: {
    tag: "Healing",
    text: "Berries that each heal 1 hit point and feed a creature for a day.",
  },
  grease: {
    tag: "Control",
    text: "Slick ground that can trip creatures (Dex save).",
  },
  "guiding-bolt": {
    tag: "Damage",
    text: "Ranged radiant attack (4d6); the next attack against the target has advantage.",
  },
  "healing-word": {
    tag: "Healing",
    text: "Heal 1d4 plus your casting modifier from a distance, as a bonus action.",
  },
  "hellish-rebuke": {
    tag: "Damage",
    text: "Reaction: burn the creature that just hurt you (Dex save, 2d10).",
  },
  heroism: {
    tag: "Buff",
    text: "An ally is immune to fear and gains temporary hit points each turn.",
  },
  "hideous-laughter": {
    tag: "Control",
    text: "The target falls prone laughing and can barely act (Wis save).",
  },
  identify: { tag: "Utility", text: "Learn what a magic item does." },
  "illusory-script": {
    tag: "Utility",
    text: "Write a message only chosen readers can understand.",
  },
  "inflict-wounds": {
    tag: "Damage",
    text: "Melee touch attack for 3d10 necrotic damage.",
  },
  jump: { tag: "Buff", text: "Triple a creature's jump distance." },
  longstrider: {
    tag: "Buff",
    text: "Add 10 feet to a creature's speed for an hour.",
  },
  "mage-armor": {
    tag: "Defense",
    text: "An unarmored target's AC becomes 13 + Dex for 8 hours.",
  },
  "magic-missile": {
    tag: "Damage",
    text: "Three darts that never miss (1d4 + 1 each).",
  },
  "protection-from-evil-and-good": {
    tag: "Defense",
    text: "Shield a creature from fiends, undead and other spooky types.",
  },
  "purify-food-and-drink": {
    tag: "Utility",
    text: "Make food and drink safe to consume.",
  },
  sanctuary: {
    tag: "Defense",
    text: "Enemies must resist or pick another target when attacking the warded creature.",
  },
  shield: {
    tag: "Defense",
    text: "Reaction: +5 AC until your next turn, and blocks magic missile.",
  },
  "shield-of-faith": {
    tag: "Defense",
    text: "+2 AC to a creature for up to 10 minutes.",
  },
  "silent-image": {
    tag: "Utility",
    text: "A visual illusion up to 15 feet across.",
  },
  sleep: {
    tag: "Control",
    text: "Put creatures with low hit points to sleep, weakest first.",
  },
  "speak-with-animals": {
    tag: "Social",
    text: "Talk with beasts for 10 minutes.",
  },
  thunderwave: {
    tag: "Damage",
    text: "Thunder blast in a 15-foot cube (Con save, 2d8) that pushes foes back.",
  },
  "unseen-servant": {
    tag: "Utility",
    text: "An invisible servant does simple chores.",
  },
};

export function getSpellSummary(spellIndex) {
  return SPELL_SUMMARIES[spellIndex] ?? null;
}

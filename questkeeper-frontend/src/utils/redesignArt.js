// The October 2026 artwork pack, as small optimized copies in src/assets
// (banners/, campaigns/ ...; made by scripts/extract_redesign_art_pack.py).
// Banners are chosen by page; the campaign landscapes are generic sample
// pictures for table cards, never real locations. A table's picture is picked
// from its id, so it stays the same from visit to visit and nothing about the
// table (its name, notes or players) decides it.
const banners = import.meta.glob("../assets/banners/*.webp", { eager: true, import: "default" });
const campaigns = import.meta.glob("../assets/campaigns/*.webp", { eager: true, import: "default" });

export const BANNER_NAMES = ["hearth", "guild-table", "wilderness", "library", "bestiary", "learning-desk", "player-game"];
export const CAMPAIGN_ART = ["village-bridge", "forest-ruins", "mountain-lake", "farm-cottage"];

// Each banner painting is 2172x724 (scripts/make_hires_banners.py also makes a
// half-size 1086px copy for ordinary screens). They are shown at their real
// size on the right of the band, never stretched wider than 1086 CSS pixels
// (that is 1:1 on a 2x screen), and their dark left side melts into the panel.
// Each says where to look in its own picture: `focus` is the vertical focal
// point, and `artWidth` is how wide the picture is drawn (so the band shows a
// recognizable part of the scene, not a magnified fragment).
const pair = (name) => ({
  src: banners[`../assets/banners/${name}-1086.webp`],
  srcSet: `${banners[`../assets/banners/${name}-1086.webp`]} 1086w, ${banners[`../assets/banners/${name}.webp`]} 2172w`,
  full: banners[`../assets/banners/${name}.webp`],
  width: 2172,
  height: 724,
});

export const BANNERS = {
  hearth: { ...pair("hearth"), focus: "right 62%", artWidth: 1086 },
  "guild-table": { ...pair("guild-table"), focus: "right 55%", artWidth: 1086 },
  wilderness: { ...pair("wilderness"), focus: "right 38%", artWidth: 1086 },
  library: { ...pair("library"), focus: "right 50%", artWidth: 1086 },
  bestiary: { ...pair("bestiary"), focus: "right 62%", artWidth: 1086 },
  "learning-desk": { ...pair("learning-desk"), focus: "right 52%", artWidth: 1086 },
  // The player's game header is much shallower than the others, so its picture
  // is drawn smaller to keep the bridge, castle and village in view.
  "player-game": { ...pair("player-game"), focus: "right 60%", artWidth: 620 },
};

export function getBanner(name) {
  return BANNERS[name]?.src;
}

export function getBannerInfo(name) {
  return BANNERS[name];
}

// A small, stable number from any text (the same text always gives the same number).
function hashOf(text) {
  let hash = 0;
  for (const letter of String(text ?? "")) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
  return hash;
}

export function getCampaignArt(tableId) {
  const name = CAMPAIGN_ART[hashOf(tableId) % CAMPAIGN_ART.length];
  return campaigns[`../assets/campaigns/${name}.webp`];
}

// Pictures for a whole list of tables: each table's own pick, except that two
// neighbours never share one (the second takes the next picture along).
export function getCampaignArtForList(tableIds) {
  let previous = -1;
  return tableIds.map((id) => {
    let pick = hashOf(id) % CAMPAIGN_ART.length;
    if (pick === previous) pick = (pick + 1) % CAMPAIGN_ART.length;
    previous = pick;
    return campaigns[`../assets/campaigns/${CAMPAIGN_ART[pick]}.webp`];
  });
}

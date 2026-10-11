import {
  resolveEdition,
  fetchDnd5eList,
  fetchDnd5eById,
  tagSrdSource,
  srdSourceLabel,
} from "../utils/dnd5eApiClient.js";
import {
  isOpen5eId,
  fetchOpen5eResource,
  fetchOpen5eOrEmpty,
  notFound,
} from "../utils/open5eClient.js";
import {
  mapOpen5eBackgrounds,
  mergeByName,
  toListItem,
} from "../utils/open5eMappers.js";

// The Open5e books QuestKeeper uses are written for the 2014 rules, so their
// backgrounds join the 2014 list only. The 2024 list stays SRD 5.2 alone.
export async function getBackgrounds(req, res, next) {
  try {
    const edition = resolveEdition(req.query);
    const [srdBackgrounds, open5eBackgrounds] = await Promise.all([
      fetchDnd5eList("backgrounds", edition, "Unable to retrieve backgrounds."),
      edition === "2014" ? fetchOpen5eOrEmpty("backgrounds") : [],
    ]);

    const data = mergeByName(
      tagSrdSource(srdBackgrounds, edition),
      mapOpen5eBackgrounds(open5eBackgrounds).map((entry) => ({
        ...toListItem(entry),
        edition: "2014",
      })),
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getBackgroundById(req, res, next) {
  try {
    const { backgroundId } = req.params;
    const message = "Unable to retrieve background details.";

    if (isOpen5eId(backgroundId)) {
      const backgrounds = await fetchOpen5eResource("backgrounds");
      const background = mapOpen5eBackgrounds(backgrounds).find(
        (entry) => entry.index === backgroundId,
      );
      if (!background) throw notFound(message);
      res.status(200).json({ data: { ...background, edition: "2014" } });
      return;
    }

    const edition = resolveEdition(req.query);
    const background = await fetchDnd5eById(
      "backgrounds",
      edition,
      backgroundId,
      message,
    );
    res
      .status(200)
      .json({ data: { ...background, source: srdSourceLabel(edition) } });
  } catch (error) {
    next(error);
  }
}

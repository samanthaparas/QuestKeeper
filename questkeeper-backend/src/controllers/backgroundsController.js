import {
  resolveEdition,
  fetchDnd5eList,
  fetchDnd5eById,
} from "../utils/dnd5eApiClient.js";

export async function getBackgrounds(req, res, next) {
  try {
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eList(
      "backgrounds",
      edition,
      "Unable to retrieve backgrounds.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getBackgroundById(req, res, next) {
  try {
    const { backgroundId } = req.params;
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eById(
      "backgrounds",
      edition,
      backgroundId,
      "Unable to retrieve background details.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

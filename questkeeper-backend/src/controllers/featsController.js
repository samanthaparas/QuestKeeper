import {
  resolveEdition,
  fetchDnd5eList,
  fetchDnd5eById,
} from "../utils/dnd5eApiClient.js";

export async function getFeats(req, res, next) {
  try {
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eList(
      "feats",
      edition,
      "Unable to retrieve feats.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getFeatById(req, res, next) {
  try {
    const { featId } = req.params;
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eById(
      "feats",
      edition,
      featId,
      "Unable to retrieve feat details.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

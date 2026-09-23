import {
  resolveEdition,
  fetchDnd5eList,
  fetchDnd5eById,
} from "../utils/dnd5eApiClient.js";

export async function getMagicItems(req, res, next) {
  try {
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eList(
      "magic-items",
      edition,
      "Unable to retrieve magic items.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getMagicItemById(req, res, next) {
  try {
    const { magicItemId } = req.params;
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eById(
      "magic-items",
      edition,
      magicItemId,
      "Unable to retrieve magic item details.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

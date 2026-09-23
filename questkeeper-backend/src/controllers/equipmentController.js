import {
  resolveEdition,
  fetchDnd5eList,
  fetchDnd5eById,
} from "../utils/dnd5eApiClient.js";

export async function getEquipment(req, res, next) {
  try {
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eList(
      "equipment",
      edition,
      "Unable to retrieve equipment.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getEquipmentById(req, res, next) {
  try {
    const { equipmentId } = req.params;
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eById(
      "equipment",
      edition,
      equipmentId,
      "Unable to retrieve equipment details.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

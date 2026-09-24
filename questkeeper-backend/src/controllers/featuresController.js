import { fetchDnd5eById } from "../utils/dnd5eApiClient.js";

export async function getFeatureById(req, res, next) {
  try {
    const { featureId } = req.params;
    const data = await fetchDnd5eById(
      "features",
      "2014",
      featureId,
      "Unable to retrieve feature details.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

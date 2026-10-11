import { fetchDnd5eById } from "../utils/dnd5eApiClient.js";
import {
  isOpen5eId,
  fetchOpen5eResource,
  notFound,
} from "../utils/open5eClient.js";
import { findOpen5eFeature } from "../utils/open5eMappers.js";

// One class or subclass feature. Open5e feature IDs look like
// "toh_cat-burglar.toh_cat-burglar_artful-dodger": the subclass, a dot, then
// the feature.
export async function getFeatureById(req, res, next) {
  try {
    const { featureId } = req.params;
    const message = "Unable to retrieve feature details.";

    if (isOpen5eId(featureId)) {
      const classes = await fetchOpen5eResource("classes");
      const feature = findOpen5eFeature(classes, featureId);
      if (!feature) throw notFound(message);
      res.status(200).json({ data: feature });
      return;
    }

    const data = await fetchDnd5eById("features", "2014", featureId, message);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

import { fetchDnd5eById } from "../utils/dnd5eApiClient.js";
import {
  isOpen5eId,
  fetchOpen5eResource,
  notFound,
} from "../utils/open5eClient.js";
import { findOpen5eTrait } from "../utils/open5eMappers.js";

// One racial trait. Open5e trait IDs look like "toh_catfolk.cats-claws":
// the race they belong to, a dot, then the trait.
export async function getTraitById(req, res, next) {
  try {
    const { traitId } = req.params;
    const message = "Unable to retrieve trait details.";

    if (isOpen5eId(traitId)) {
      const species = await fetchOpen5eResource("species");
      const trait = findOpen5eTrait(species, traitId);
      if (!trait) throw notFound(message);
      res.status(200).json({ data: trait });
      return;
    }

    const data = await fetchDnd5eById("traits", "2014", traitId, message);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

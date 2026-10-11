import { fetchDnd5eList, fetchDnd5eById } from "../utils/dnd5eApiClient.js";
import {
  isOpen5eId,
  fetchOpen5eResource,
  notFound,
} from "../utils/open5eClient.js";
import { mapOpen5eSubraces } from "../utils/open5eMappers.js";

// Subraces live inside Open5e's species list, so both handlers below look
// them up there when the ID is an Open5e one.
async function findOpen5eSubrace(subraceId, message) {
  const species = await fetchOpen5eResource("species");
  const subrace = mapOpen5eSubraces(species).find(
    (entry) => entry.index === subraceId,
  );
  if (!subrace) throw notFound(message);
  return subrace;
}

export async function getSubraceById(req, res, next) {
  try {
    const { subraceId } = req.params;
    const message = "Unable to retrieve subrace details.";

    const data = isOpen5eId(subraceId)
      ? await findOpen5eSubrace(subraceId, message)
      : {
          ...(await fetchDnd5eById("subraces", "2014", subraceId, message)),
          source: "SRD 5.1",
        };

    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSubraceTraits(req, res, next) {
  try {
    const { subraceId } = req.params;
    const message = "Unable to retrieve subrace traits.";

    const data = isOpen5eId(subraceId)
      ? (await findOpen5eSubrace(subraceId, message)).racial_traits
      : await fetchDnd5eList(
          `subraces/${encodeURIComponent(subraceId)}/traits`,
          "2014",
          message,
        );

    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

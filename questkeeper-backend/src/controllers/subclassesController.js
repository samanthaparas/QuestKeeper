import { fetchDnd5eList } from "../utils/dnd5eApiClient.js";
import {
  isOpen5eId,
  fetchOpen5eResource,
  notFound,
} from "../utils/open5eClient.js";
import { mapOpen5eSubclasses } from "../utils/open5eMappers.js";

// Open5e lists subclasses alongside classes, so both handlers below look
// them up in Open5e's class list when the ID is an Open5e one.
async function findOpen5eSubclass(subclassId, message) {
  const classes = await fetchOpen5eResource("classes");
  const subclass = mapOpen5eSubclasses(classes).find(
    (entry) => entry.index === subclassId,
  );
  if (!subclass) throw notFound(message);
  return subclass;
}

export async function getSubclassById(req, res, next) {
  try {
    const { subclassId } = req.params;

    if (isOpen5eId(subclassId)) {
      const subclass = await findOpen5eSubclass(
        subclassId,
        "Unable to retrieve subclass details.",
      );
      res.status(200).json({ data: subclass });
      return;
    }

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/subclasses/${subclassId}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve subclass details.");
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();

    res.status(200).json({
      data: { ...data, source: "SRD 5.1" },
    });
  } catch (error) {
    next(error);
  }
}

// The features a subclass grants, as a short list ({ index, name, level }).
// The frontend opens each one through /api/features/:featureId.
export async function getSubclassFeatures(req, res, next) {
  try {
    const { subclassId } = req.params;
    const message = "Unable to retrieve subclass features.";

    if (isOpen5eId(subclassId)) {
      const subclass = await findOpen5eSubclass(subclassId, message);
      const data = subclass.features.map(({ index, name, level }) => ({
        index,
        name,
        level,
      }));
      res.status(200).json({ data });
      return;
    }

    const data = await fetchDnd5eList(
      `subclasses/${encodeURIComponent(subclassId)}/features`,
      "2014",
      message,
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

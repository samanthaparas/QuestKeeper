import { fetchDnd5eList } from "../utils/dnd5eApiClient.js";

export async function getSubclassById(req, res, next) {
  try {
    const { subclassId } = req.params;

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
      data: data,
    });
  } catch (error) {
    next(error);
  }
}
export async function getSubclassFeatures(req, res, next) {
  try {
    const { subclassId } = req.params;
    const data = await fetchDnd5eList(
      `subclasses/${encodeURIComponent(subclassId)}/features`,
      "2014",
      "Unable to retrieve subclass features.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

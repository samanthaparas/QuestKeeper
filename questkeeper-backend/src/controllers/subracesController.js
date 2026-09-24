import { fetchDnd5eList } from "../utils/dnd5eApiClient.js";

export async function getSubraceById(req, res, next) {
  try {
    const { subraceId } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/subraces/${subraceId}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve subrace details.");
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

export async function getSubraceTraits(req, res, next) {
  try {
    const { subraceId } = req.params;
    const data = await fetchDnd5eList(
      `subraces/${encodeURIComponent(subraceId)}/traits`,
      "2014",
      "Unable to retrieve subrace traits.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

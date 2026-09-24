import { fetchDnd5eList } from "../utils/dnd5eApiClient.js";

export async function getRaces(req, res, next) {
  try {
    const response = await fetch("https://www.dnd5eapi.co/api/2014/races");

    if (!response.ok) {
      const error = new Error("Unable to retrieve races.");
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();

    res.status(200).json({
      data: data.results,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRaceById(req, res, next) {
  try {
    const { raceId } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/races/${raceId}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve race details.");
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

export async function getRaceTraits(req, res, next) {
  try {
    const { raceId } = req.params;
    const data = await fetchDnd5eList(
      `races/${encodeURIComponent(raceId)}/traits`,
      "2014",
      "Unable to retrieve race traits.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

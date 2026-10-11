import { fetchDnd5eList, tagSrdSource } from "../utils/dnd5eApiClient.js";
import { fetchOpen5eOrEmpty } from "../utils/open5eClient.js";
import { getOpen5eSubclassRefsForClass } from "../utils/open5eMappers.js";

export async function getClasses(req, res, next) {
  try {
    const response = await fetch("https://www.dnd5eapi.co/api/2014/classes");

    if (!response.ok) {
      const error = new Error("Unable to retrieve classes.");
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

// One class. Its subclass list includes the Open5e subclasses made for it,
// so a Rogue can pick Cat Burglar as well as the SRD's Thief. If Open5e is
// down, only the SRD subclass is listed.
export async function getClassById(req, res, next) {
  try {
    const { classId } = req.params;

    const [response, open5eClasses] = await Promise.all([
      fetch(`https://www.dnd5eapi.co/api/2014/classes/${classId}`),
      fetchOpen5eOrEmpty("classes"),
    ]);

    if (!response.ok) {
      const error = new Error("Unable to retrieve class details.");
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();

    res.status(200).json({
      data: {
        ...data,
        subclasses: [
          ...tagSrdSource(data.subclasses ?? []),
          ...getOpen5eSubclassRefsForClass(open5eClasses, classId),
        ],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getClassSpells(req, res, next) {
  try {
    const { classId } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/classes/${classId}/spells`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve class spell list.");
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

export async function getClassLevel(req, res, next) {
  try {
    const { classId, level } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/classes/${classId}/levels/${level}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve class level details.");
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

export async function getClassFeatures(req, res, next) {
  try {
    const { classId } = req.params;
    const data = await fetchDnd5eList(
      `classes/${encodeURIComponent(classId)}/features`,
      "2014",
      "Unable to retrieve class features.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

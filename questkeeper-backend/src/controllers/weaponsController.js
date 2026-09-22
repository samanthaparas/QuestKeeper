import { resolveEdition, fetchDnd5eById } from "../utils/dnd5eApiClient.js";

const BASE_URL = "https://www.dnd5eapi.co/api";

export async function getWeapons(req, res, next) {
  try {
    const edition = resolveEdition(req.query);
    const response = await fetch(
      `${BASE_URL}/${edition}/equipment-categories/weapon`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve weapons.");
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    const weapons = data.equipment.map((entry) => ({ ...entry, edition }));

    res.status(200).json({ data: weapons });
  } catch (error) {
    next(error);
  }
}

export async function getWeaponById(req, res, next) {
  try {
    const { weaponId } = req.params;
    const edition = resolveEdition(req.query);
    const data = await fetchDnd5eById(
      "equipment",
      edition,
      weaponId,
      "Unable to retrieve weapon details.",
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

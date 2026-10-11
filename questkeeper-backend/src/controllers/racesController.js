import {
  fetchDnd5eList,
  fetchDnd5eById,
  tagSrdSource,
} from "../utils/dnd5eApiClient.js";
import {
  isOpen5eId,
  fetchOpen5eResource,
  fetchOpen5eOrEmpty,
  notFound,
} from "../utils/open5eClient.js";
import {
  mapOpen5eRaces,
  getOpen5eSubraceRefsForSrdRace,
  mergeByName,
  toListItem,
} from "../utils/open5eMappers.js";

// SRD races and Open5e races in one alphabetical list. If Open5e is down,
// the SRD races still come back.
export async function getRaces(req, res, next) {
  try {
    const [srdRaces, species] = await Promise.all([
      fetchDnd5eList("races", "2014", "Unable to retrieve races."),
      fetchOpen5eOrEmpty("species"),
    ]);

    const data = mergeByName(
      tagSrdSource(srdRaces),
      mapOpen5eRaces(species).map(toListItem),
    );
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

// One race. Open5e IDs are looked up in Open5e; SRD races also get any
// Open5e subraces that belong to them (Stoor Halfling joins Halfling).
export async function getRaceById(req, res, next) {
  try {
    const { raceId } = req.params;

    if (isOpen5eId(raceId)) {
      const species = await fetchOpen5eResource("species");
      const race = mapOpen5eRaces(species).find(
        (entry) => entry.index === raceId,
      );
      if (!race) throw notFound("Unable to retrieve race details.");
      res.status(200).json({ data: race });
      return;
    }

    const [race, species] = await Promise.all([
      fetchDnd5eById("races", "2014", raceId, "Unable to retrieve race details."),
      fetchOpen5eOrEmpty("species"),
    ]);

    const data = {
      ...race,
      source: "SRD 5.1",
      subraces: [
        ...tagSrdSource(race.subraces ?? []),
        ...getOpen5eSubraceRefsForSrdRace(species, raceId),
      ],
    };
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getRaceTraits(req, res, next) {
  try {
    const { raceId } = req.params;

    if (isOpen5eId(raceId)) {
      const species = await fetchOpen5eResource("species");
      const race = mapOpen5eRaces(species).find(
        (entry) => entry.index === raceId,
      );
      if (!race) throw notFound("Unable to retrieve race traits.");
      res.status(200).json({ data: race.traits });
      return;
    }

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

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

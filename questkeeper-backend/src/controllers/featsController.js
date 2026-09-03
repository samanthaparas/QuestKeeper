export async function getFeats(req, res, next) {
  try {
    const response = await fetch("https://www.dnd5eapi.co/api/2014/feats");

    if (!response.ok) {
      const error = new Error("Unable to retrieve feats.");
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

export async function getFeatById(req, res, next) {
  try {
    const { featId } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/feats/${featId}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve feat details.");
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

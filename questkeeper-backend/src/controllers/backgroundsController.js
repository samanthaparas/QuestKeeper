const BACKGROUNDS_URL = "https://www.dnd5eapi.co/api/2014/backgrounds";

export async function getBackgrounds(req, res, next) {
  try {
    const response = await fetch(BACKGROUNDS_URL);

    if (!response.ok) {
      const error = new Error("Unable to retrieve backgrounds.");
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    res.status(200).json({ data: data.results });
  } catch (error) {
    next(error);
  }
}

export async function getBackgroundById(req, res, next) {
  try {
    const { backgroundId } = req.params;
    const response = await fetch(
      `${BACKGROUNDS_URL}/${encodeURIComponent(backgroundId)}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve background details.");
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSpells(req, res, next) {
  try {
    const response = await fetch("https://www.dnd5eapi.co/api/2014/spells");

    if (!response.ok) {
      const error = new Error("Unable to retrieve spells.");
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

export async function getSpellById(req, res, next) {
  try {
    const { spellId } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/spells/${spellId}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve spell details.");
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

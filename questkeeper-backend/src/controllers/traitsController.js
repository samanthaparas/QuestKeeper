export async function getTraitById(req, res, next) {
  try {
    const { traitId } = req.params;

    const response = await fetch(
      `https://www.dnd5eapi.co/api/2014/traits/${traitId}`,
    );

    if (!response.ok) {
      const error = new Error("Unable to retrieve trait details.");
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

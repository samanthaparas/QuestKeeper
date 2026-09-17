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

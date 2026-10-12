import app from "./app.js";
import { fetchCatalogItems } from "./controllers/magicItemsController.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`QuestKeeper is running on port ${PORT}`);
  // Load the magic items catalog now, so the first visitor doesn't wait for it.
  fetchCatalogItems().catch((error) =>
    console.warn("Magic items catalog will load on first visit:", error.message),
  );
});

import app from "./app.js";
import { fetchCatalogItems } from "./controllers/magicItemsController.js";
import { fetchSpellList } from "./controllers/spellsController.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`QuestKeeper is running on port ${PORT}`);
  // Load the slow lists now, so the first visitor doesn't wait for them.
  fetchCatalogItems().catch((error) =>
    console.warn("Magic items catalog will load on first visit:", error.message),
  );
  fetchSpellList().catch((error) =>
    console.warn("Spell list will load on first visit:", error.message),
  );
});

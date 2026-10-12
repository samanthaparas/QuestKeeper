import express from "express";
import {
  getMagicItems,
  getMagicItemById,
  getMagicItemCatalog,
  getMagicItemCatalogEntry,
} from "../controllers/magicItemsController.js";

const router = express.Router();

router.get("/", getMagicItems);
// The catalog routes come first so "catalog" isn't read as an item ID.
router.get("/catalog", getMagicItemCatalog);
router.get("/catalog/:itemIndex", getMagicItemCatalogEntry);
router.get("/:magicItemId", getMagicItemById);

export default router;

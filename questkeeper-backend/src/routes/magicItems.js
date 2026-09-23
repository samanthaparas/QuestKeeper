import express from "express";
import {
  getMagicItems,
  getMagicItemById,
} from "../controllers/magicItemsController.js";

const router = express.Router();

router.get("/", getMagicItems);
router.get("/:magicItemId", getMagicItemById);

export default router;

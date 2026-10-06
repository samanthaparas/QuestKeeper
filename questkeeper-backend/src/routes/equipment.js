import express from "express";
import {
  getEquipment,
  getEquipmentById,
  getEquipmentCategory,
} from "../controllers/equipmentController.js";

const router = express.Router();

router.get("/", getEquipment);
// Before "/:equipmentId" so "categories" isn't read as an item id.
router.get("/categories/:categoryId", getEquipmentCategory);
router.get("/:equipmentId", getEquipmentById);

export default router;

import express from "express";
import {
  getEquipment,
  getEquipmentById,
} from "../controllers/equipmentController.js";

const router = express.Router();

router.get("/", getEquipment);
router.get("/:equipmentId", getEquipmentById);

export default router;

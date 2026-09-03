import express from "express";
import {
  getClasses,
  getClassById,
  getClassSpells,
} from "../controllers/classesController.js";

const router = express.Router();

router.get("/", getClasses);

router.get("/:classId/spells", getClassSpells);

router.get("/:classId", getClassById);

export default router;

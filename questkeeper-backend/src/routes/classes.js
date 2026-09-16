import express from "express";
import {
  getClasses,
  getClassById,
  getClassSpells,
  getClassLevel,
} from "../controllers/classesController.js";

const router = express.Router();

router.get("/", getClasses);

router.get("/:classId/spells", getClassSpells);

router.get("/:classId/levels/:level", getClassLevel);

router.get("/:classId", getClassById);

export default router;

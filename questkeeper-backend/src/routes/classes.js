import express from "express";
import {
  getClasses,
  getClassById,
  getClassSpells,
  getClassLevel,
  getClassLevels,
  getClassFeatures,
} from "../controllers/classesController.js";

const router = express.Router();

router.get("/", getClasses);

router.get("/:classId/spells", getClassSpells);

// All 20 levels in one go, each with the features it brings.
router.get("/:classId/levels", getClassLevels);

router.get("/:classId/levels/:level", getClassLevel);

router.get("/:classId", getClassById);

router.get("/:classId/features", getClassFeatures);

export default router;

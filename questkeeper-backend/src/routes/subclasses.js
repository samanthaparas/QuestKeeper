import express from "express";
import {
  getSubclassById,
  getSubclassFeatures,
} from "../controllers/subclassesController.js";

const router = express.Router();

router.get("/:subclassId", getSubclassById);

router.get("/:subclassId/features", getSubclassFeatures);

export default router;

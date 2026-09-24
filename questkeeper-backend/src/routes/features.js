import express from "express";
import { getFeatureById } from "../controllers/featuresController.js";

const router = express.Router();

router.get("/:featureId", getFeatureById);

export default router;

import express from "express";
import {
  getBackgrounds,
  getBackgroundById,
} from "../controllers/backgroundsController.js";

const router = express.Router();

router.get("/", getBackgrounds);
router.get("/:backgroundId", getBackgroundById);

export default router;

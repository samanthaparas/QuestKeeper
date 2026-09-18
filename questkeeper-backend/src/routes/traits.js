import express from "express";
import { getTraitById } from "../controllers/traitsController.js";

const router = express.Router();

router.get("/:traitId", getTraitById);

export default router;

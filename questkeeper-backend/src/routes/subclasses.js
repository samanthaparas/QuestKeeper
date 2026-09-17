import express from "express";
import { getSubclassById } from "../controllers/subclassesController.js";

const router = express.Router();

router.get("/:subclassId", getSubclassById);

export default router;

import express from "express";
import { getHealth } from "../controllers/healthController.js";

// GET /api/health (see healthController.js).
const router = express.Router();

router.get("/", getHealth);

export default router;

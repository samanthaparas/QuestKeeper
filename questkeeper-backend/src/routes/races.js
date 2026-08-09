import express from "express";
import { getRaces, getRaceById } from "../controllers/racesController.js";

const router = express.Router();

router.get("/", getRaces);

router.get("/:raceId", getRaceById);

export default router;

import express from "express";
import { getSpells, getSpellById } from "../controllers/spellsController.js";

const router = express.Router();

router.get("/", getSpells);

router.get("/:spellId", getSpellById);

export default router;

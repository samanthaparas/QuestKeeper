import express from "express";
import { getMonsters, getMonsterById } from "../controllers/monstersController.js";

const router = express.Router();

router.get("/", getMonsters);

router.get("/:monsterId", getMonsterById);

export default router;

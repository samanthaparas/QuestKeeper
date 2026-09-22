import express from "express";
import { getWeapons, getWeaponById } from "../controllers/weaponsController.js";

const router = express.Router();

router.get("/", getWeapons);

router.get("/:weaponId", getWeaponById);

export default router;

import express from "express";
import {
  getRaces,
  getRaceById,
  getRaceTraits,
} from "../controllers/racesController.js";

const router = express.Router();

router.get("/", getRaces);

router.get("/:raceId", getRaceById);

router.get("/:raceId/traits", getRaceTraits);

export default router;

import express from "express";
import { getFeats, getFeatById } from "../controllers/featsController.js";

const router = express.Router();

router.get("/", getFeats);

router.get("/:featId", getFeatById);

export default router;

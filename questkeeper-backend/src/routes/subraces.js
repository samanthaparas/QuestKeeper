import express from "express";
import { getSubraceById } from "../controllers/subracesController.js";

const router = express.Router();

router.get("/:subraceId", getSubraceById);

export default router;

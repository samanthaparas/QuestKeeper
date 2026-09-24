import express from "express";
import {
  getSubraceById,
  getSubraceTraits,
} from "../controllers/subracesController.js";

const router = express.Router();

router.get("/:subraceId", getSubraceById);

router.get("/:subraceId/traits", getSubraceTraits);

export default router;

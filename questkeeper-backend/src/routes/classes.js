import express from "express";
import { getClasses, getClassById } from "../controllers/classesController.js";

const router = express.Router();

router.get("/", getClasses);

router.get("/:classId", getClassById);

export default router;

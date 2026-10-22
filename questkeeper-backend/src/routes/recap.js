import express from "express";
import { writeRecap } from "../controllers/recapController.js";

const router = express.Router();

// "Previously on...": a session's shared notes in, a short recap out.
router.post("/", writeRecap);

export default router;

import express from "express";
import { homebrewSummary } from "../controllers/homebrewSummaryController.js";

const router = express.Router();

// "Summarize for my group": pasted rules in, short own-words summary out.
router.post("/", homebrewSummary);

export default router;

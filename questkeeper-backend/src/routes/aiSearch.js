import express from "express";
import { aiSearch } from "../controllers/aiSearchController.js";

const router = express.Router();

// Search by meaning: { query } in, matching rules entries out.
router.post("/", aiSearch);

export default router;

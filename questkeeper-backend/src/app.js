import express from "express";
import cors from "cors";
import spellsRouter from "./routes/spells.js";
import classesRouter from "./routes/classes.js";
import racesRouter from "./routes/races.js";
import backgroundsRouter from "./routes/backgrounds.js";
import featsRouter from "./routes/feats.js";
import subracesRouter from "./routes/subraces.js";
import subclassesRouter from "./routes/subclasses.js";
import traitsRouter from "./routes/traits.js";
import weaponsRouter from "./routes/weapons.js";
import equipmentRouter from "./routes/equipment.js";
import magicItemsRouter from "./routes/magicItems.js";
import featuresRouter from "./routes/features.js";
import aiSearchRouter from "./routes/aiSearch.js";
import homebrewSummaryRouter from "./routes/homebrewSummary.js";
import monstersRouter from "./routes/monsters.js";
import recapRouter from "./routes/recap.js";
import healthRouter from "./routes/health.js";

const app = express();

// Render sits one proxy in front of the server; this makes req.ip the
// visitor's own address, which the AI search's per-visitor limit relies on.
app.set("trust proxy", 1);

// Only QuestKeeper's own website (and a developer's own computer) may call
// this API from a browser. Add more addresses, like a new domain, in the
// ALLOWED_ORIGINS setting on the server, separated by commas. Requests with no
// browser origin (a monitoring tool, curl) aren't affected.
const SITE_ORIGINS = ["https://questkeeper-it0i.onrender.com"];
const OWN_COMPUTER = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin) {
  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return !origin || OWN_COMPUTER.test(origin) || SITE_ORIGINS.includes(origin) || extra.includes(origin);
}

// Don't announce what the server runs on, and stop browsers guessing at what
// kind of file an answer is.
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) }));
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "QuestKeeper backend is running.",
  });
});

app.use("/api/spells", spellsRouter);
app.use("/api/classes", classesRouter);
app.use("/api/races", racesRouter);
app.use("/api/backgrounds", backgroundsRouter);
app.use("/api/feats", featsRouter);
app.use("/api/subraces", subracesRouter);
app.use("/api/subclasses", subclassesRouter);
app.use("/api/traits", traitsRouter);
app.use("/api/weapons", weaponsRouter);
app.use("/api/equipment", equipmentRouter);
app.use("/api/magic-items", magicItemsRouter);
app.use("/api/features", featuresRouter);
app.use("/api/ai-search", aiSearchRouter);
app.use("/api/homebrew-summary", homebrewSummaryRouter);
app.use("/api/monsters", monstersRouter);
app.use("/api/recap", recapRouter);
// "Is the API alive?", for a quick check or a monitoring tool.
app.use("/api/health", healthRouter);

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    message: error.message || "Something went wrong.",
  });
});

export default app;

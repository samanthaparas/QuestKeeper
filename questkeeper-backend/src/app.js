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

const app = express();

// Render sits one proxy in front of the server; this makes req.ip the
// visitor's own address, which the AI search's per-visitor limit relies on.
app.set("trust proxy", 1);

app.use(cors());
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

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    message: error.message || "Something went wrong.",
  });
});

export default app;

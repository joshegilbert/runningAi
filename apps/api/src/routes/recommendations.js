import express from "express";
import requireAuth from "../middleware/auth.js";
import {
  getOrCreateTodayRecommendation,
  regenerateTodayRecommendation,
} from "../services/recommendation/recommendationService.js";

const router = express.Router();

// GET /api/recommendations/today
router.get("/today", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const rec = await getOrCreateTodayRecommendation(userId);
    res.json(rec);
  } catch (err) {
    console.error("GET /api/recommendations/today failed:", err);
    res.status(500).json({ error: "Failed to get recommendation" });
  }
});

router.post("/today/regenerate", requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const rec = await regenerateTodayRecommendation(userId);
    res.json(rec);
  } catch (err) {
    console.error("POST /api/recommendations/today/regenerate failed:", err);
    res.status(500).json({ error: "Failed to regenerate recommendation" });
  }
});

export default router;

import { Router } from "express";
import auth from "../middleware/auth.js";
import Workout from "../models/Workout.js";

const router = Router();

// Create a manual workout
router.post("/", auth, async (req, res) => {
  try {
    const {
      date,
      type,
      distanceMeters,
      durationSeconds,
      title,
      notes,
      avgSpeedMps,
      elevationGainM,
      avgHeartRateBpm,
      maxHeartRateBpm,
      sufferScore,
      perceivedEffort,
      sportType,
    } = req.body || {};

    const workout = await Workout.create({
      user: req.userId,
      date,
      type,
      distanceMeters,
      durationSeconds,

      title: title || "",
      notes: notes || "",

      avgSpeedMps: avgSpeedMps ?? null,
      elevationGainM: elevationGainM ?? null,
      avgHeartRateBpm: avgHeartRateBpm ?? null,
      maxHeartRateBpm: maxHeartRateBpm ?? null,
      sufferScore: sufferScore ?? null,
      perceivedEffort: perceivedEffort ?? null,
      sportType: sportType || "Run",

      source: { provider: "manual" },
    });

    res.status(201).json({ workout });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get recent workouts
router.get("/", auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ user: req.userId })
      .sort({ date: -1 })
      .limit(50);

    res.json({ workouts });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const workout = await Workout.findOne({
      _id: req.params.id,
      user: req.userId,
    });
    if (!workout) {
      return res.status(404).json({ message: "Workout not found." });
    }
    res.json({ workout });
  } catch (err) {
    return res.status(404).json({ message: "Workout not found." });
  }
});

export default router;

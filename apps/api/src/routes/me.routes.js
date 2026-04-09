import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.userId).select(
    "_id email createdAt trainingProfile"
  );
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ user });
});

router.patch("/", auth, async (req, res) => {
  try {
    const { trainingProfile } = req.body || {};
    if (!trainingProfile || typeof trainingProfile !== "object") {
      return res.status(400).json({ error: "trainingProfile is required" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Shallow merge is enough for v1; nested fields can be sent explicitly.
    user.trainingProfile = {
      ...(user.trainingProfile?.toObject?.() ?? user.trainingProfile ?? {}),
      ...trainingProfile,
    };

    await user.save();

    const saved = await User.findById(req.userId).select(
      "_id email createdAt trainingProfile"
    );
    res.json({ user: saved });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to update profile" });
  }
});

export default router;

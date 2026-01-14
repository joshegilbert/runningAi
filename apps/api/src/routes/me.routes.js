import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("_id email createdAt");
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({ user });
});

export default router;

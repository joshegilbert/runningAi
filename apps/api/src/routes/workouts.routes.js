import { Router } from "express";
import auth from "../middleware/auth.js";
import Workout from "../models/Workout.js";

const router = Router();


router.post("/", auth, async (req, res) =>{
    try {
        const {date, type, distanceMeters, durationSeconds, notes} = req.body;

        const workout = await Workout.create({
            user: req.userId,
            date,
            type,
            distanceMeters,
            durationSeconds,
            notes
        });

        res.status(201).json({ workout });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get("/", auth, async (req, res) => {
    try {
        const workouts = await Workout.find({ user: req.userId})
        .sort({date: -1})
        .limit(50)

        res.json({ workouts });
    } catch (err){
        res.status(500).json({ message: "Server error"})
    }
});

export default router;
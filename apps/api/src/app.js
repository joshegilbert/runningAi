import express from "express";
import cors from "cors";

import errorHandler from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import meRoutes from "./routes/me.routes.js";
import workoutRoutes from "./routes/workouts.routes.js"
import stravaRoutes from "./routes/strava.routes.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/strava", stravaRoutes)


app.use(errorHandler);

export default app;

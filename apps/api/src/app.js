import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import meRoutes from "./routes/me.routes.js";
import errorHandler from "./middleware/error.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);

app.use(errorHandler);

export default app;

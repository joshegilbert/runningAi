import dotenv from "dotenv";

dotenv.config();

import connectDb from "../apps/api/src/config/db.js";
import app from "../apps/api/src/app.js";

await connectDb();

export default app;

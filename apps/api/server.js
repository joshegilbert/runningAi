import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import connectDb from "./src/config/db.js";

const PORT = process.env.PORT || 8080;

await connectDb();

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

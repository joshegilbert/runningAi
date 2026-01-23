import { Router } from "express";
import auth from "../middleware/auth.js";
import StravaConnection from "../models/StravaConnection.js";

const router = Router();

router.get("/connect", auth, (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectURI = process.env.STRAVA_REDIRECT_URI;

  const scope = "read,activity:read_all";
  const approvalPrompt = "auto";
  const responseType = "code";

  const url =
    "https://www.strava.com/oauth/authorize" +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectURI)}` +
    `&response_type=${encodeURIComponent(responseType)}` +
    `&approval_prompt=${encodeURIComponent(approvalPrompt)}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(req.userId)}`;

  res.json({ url });
});

router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state;

    if (!code || !state) {
      return res.status(400).json({ message: "Missing code or state" });
    }

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      return res
        .status(400)
        .json({ message: "Strava token exchange failed", details: text });
    }

    const tokenData = await tokenRes.json();

    const athleteId = tokenData.athlete?.id;
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresAt = tokenData.expires_at;

    await StravaConnection.findOneAndUpdate(
      { user: state },
      { user: state, athleteId, accessToken, refreshToken, expiresAt },
      { upsert: true, new: true }
    );

    res.redirect(
      (process.env.CLIENT_ORIGIN || "http://localhost:5173") + "/dashboard"
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
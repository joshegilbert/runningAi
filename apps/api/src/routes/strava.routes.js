import { Router } from "express";
import auth from "../middleware/auth.js";
import StravaConnection from "../models/StravaConnection.js";
import Workout from "../models/Workout.js";

const router = Router();

/**
 * Ensures we always have a valid Strava access token.
 * Refreshes it if expired.
 */
async function getValidAccessToken(userId) {
  const conn = await StravaConnection.findOne({ user: userId });
  if (!conn) throw new Error("Strava not connected");

  const now = Math.floor(Date.now() / 1000);

  // Token still valid
  if (conn.expiresAt > now + 60) return conn.accessToken;

  // Refresh token
  const refreshRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: conn.refreshToken,
    }),
  });

  if (!refreshRes.ok) {
    const text = await refreshRes.text();
    throw new Error(`Strava refresh failed: ${text}`);
  }

  const data = await refreshRes.json();

  conn.accessToken = data.access_token;
  conn.refreshToken = data.refresh_token;
  conn.expiresAt = data.expires_at;

  // Strava refresh responses may not always include scope
  conn.scope = data.scope ?? conn.scope ?? "";

  await conn.save();
  return conn.accessToken;
}

/**
 * Helper: Convert a Strava activity into our Workout doc shape
 */
function toWorkoutDoc(userId, a) {
  return {
    user: userId,

    date: a.start_date, // UTC
    title: a.name || "",
    notes: "", // keep notes for user-entered notes later

    sportType: a.sport_type || a.type || "Run",

    // Coach labeling (simple MVP default)
    type: a.type === "Run" ? "easy" : "workout",

    distanceMeters: a.distance ?? 0,
    durationSeconds: a.moving_time ?? a.elapsed_time ?? 0,

    avgSpeedMps: a.average_speed ?? null,
    elevationGainM: a.total_elevation_gain ?? null,

    avgHeartRateBpm: a.has_heartrate ? (a.average_heartrate ?? null) : null,
    maxHeartRateBpm: a.has_heartrate ? (a.max_heartrate ?? null) : null,

    sufferScore: a.suffer_score ?? null,

    source: {
      provider: "strava",
      activityId: String(a.id),

      startDateLocal: a.start_date_local ? new Date(a.start_date_local) : null,
      timezone: a.timezone || "",
      deviceName: a.device_name || "",
    },
  };
}

/**
 * GET /api/strava/activities
 * Fetch recent Strava activities (read-only)
 */
router.get("/activities", auth, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.userId);

    const stravaRes = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=10",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!stravaRes.ok) {
      const text = await stravaRes.text();
      return res
        .status(400)
        .json({ message: "Failed to fetch activities", details: text });
    }

    const activities = await stravaRes.json();
    res.json({ activities });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/strava/activities/:id/import
 * Import a single Strava activity
 */
router.post("/activities/:id/import", auth, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.userId);
    const activityId = req.params.id;

    const stravaRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!stravaRes.ok) {
      const text = await stravaRes.text();
      return res
        .status(400)
        .json({ message: "Failed to fetch activity details", details: text });
    }

    const a = await stravaRes.json();
    const workoutDoc = toWorkoutDoc(req.userId, a);

    const filter = {
      user: req.userId,
      "source.provider": "strava",
      "source.activityId": String(a.id),
    };

    const workout = await Workout.findOneAndUpdate(
      filter,
      { $set: workoutDoc },
      { upsert: true, new: true },
    );

    res.status(201).json({ workout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/strava/sync
 * Bulk sync recent Strava runs
 */
router.post("/sync", auth, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.userId);

    const stravaRes = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=50",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!stravaRes.ok) {
      const text = await stravaRes.text();
      throw new Error(text);
    }

    const activities = await stravaRes.json();

    let created = 0;
    let updated = 0;

    for (const a of activities) {
      if (a.type !== "Run") continue;

      const workoutDoc = toWorkoutDoc(req.userId, a);

      const filter = {
        user: req.userId,
        "source.provider": "strava",
        "source.activityId": String(a.id),
      };

      const result = await Workout.findOneAndUpdate(
        filter,
        { $set: workoutDoc },
        { upsert: true, new: true, rawResult: true },
      );

      if (result.lastErrorObject?.updatedExisting) updated++;
      else created++;
    }

    // Mark last successful sync
    await StravaConnection.updateOne(
      { user: req.userId },
      { $set: { lastSyncAt: new Date() } },
    );

    res.json({ message: "Strava sync complete", created, updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/strava/connect
 * Returns Strava OAuth URL
 */
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

/**
 * GET /api/strava/callback
 * Handles OAuth redirect from Strava
 */
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

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

    await StravaConnection.findOneAndUpdate(
      { user: state },
      {
        user: state,
        athleteId: tokenData.athlete?.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_at,
        scope: tokenData.scope || "",
        connectedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    res.redirect(
      (process.env.CLIENT_ORIGIN || "http://localhost:5173") + "/dashboard",
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

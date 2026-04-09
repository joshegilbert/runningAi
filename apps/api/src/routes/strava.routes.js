import { Router } from "express";
import crypto from "crypto";
import auth from "../middleware/auth.js";
import StravaConnection from "../models/StravaConnection.js";
import StravaOAuthState from "../models/StravaOAuthState.js";
import Workout from "../models/Workout.js";
import RawStravaActivity from "../models/RawStravaActivity.js";

const router = Router();

function redirectToClient(res, { status, reason }) {
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

  const url = new URL("/strava/connected", origin);
  url.searchParams.set("status", status);

  if (reason) url.searchParams.set("reason", reason);

  return res.redirect(url.toString());
}

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
  conn.scope = data.scope ?? conn.scope ?? "";
  await conn.save();

  return conn.accessToken;
}

/**
 * Map a Strava activity summary/detail payload into YOUR Workout schema shape.
 * Keeps HR fields nullable when not present.
 */
function mapStravaToWorkout({ userId, a }) {
  const hasHR = Boolean(a.has_heartrate);

  return {
    user: userId,

    date: a.start_date ? new Date(a.start_date) : new Date(),

    // Keep simple for now. Later you'll classify using pace/HR/suffer/etc.
    type: "easy",

    title: a.name || "",
    notes: "",

    // Core
    distanceMeters: a.distance ?? 0,
    durationSeconds: a.moving_time ?? a.elapsed_time ?? 0,

    // Extras (nullable)
    avgSpeedMps: a.average_speed ?? null,
    elevationGainM: a.total_elevation_gain ?? null,

    avgHeartRateBpm: hasHR ? (a.average_heartrate ?? null) : null,
    maxHeartRateBpm: hasHR ? (a.max_heartrate ?? null) : null,

    sufferScore: a.suffer_score ?? null,

    sportType: a.sport_type || a.type || "Run",

    startDateLocal: a.start_date_local ? new Date(a.start_date_local) : null,
    timezone: a.timezone || "",
    utcOffsetSeconds: typeof a.utc_offset === "number" ? a.utc_offset : null,

    metricsVersion: 1,
    ingestedAt: new Date(),

    source: {
      provider: "strava",
      activityId: String(a.id),
      deviceName: a.device_name || "",
    },
  };
}

/**
 * GET /api/strava/status
 * For UI: show if Strava is connected and last sync time.
 */
router.get("/status", auth, async (req, res) => {
  try {
    const conn = await StravaConnection.findOne({ user: req.userId }).lean();
    if (!conn) return res.json({ connected: false });

    res.json({
      connected: true,
      athleteId: conn.athleteId,
      scope: conn.scope || "",
      connectedAt: conn.connectedAt || null,
      lastSyncAt: conn.lastSyncAt || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/strava/activities
 * Read-only preview of recent activities
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
 * POST /api/strava/sync
 * Incremental sync:
 * - default: fetch after lastSyncAt (if exists)
 * - ?full=true => ignore lastSyncAt and pull older history (paged)
 */
router.post("/sync", auth, async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req.userId);

    const conn = await StravaConnection.findOne({ user: req.userId });
    if (!conn) throw new Error("Strava not connected");

    const full = String(req.query.full || "").toLowerCase() === "true";

    const after =
      !full && conn.lastSyncAt
        ? Math.floor(new Date(conn.lastSyncAt).getTime() / 1000)
        : null;

    const perPage = 200;
    let page = 1;

    let created = 0;
    let updated = 0;
    let processed = 0;
    let rawUpserts = 0;

    while (true) {
      const url = new URL("https://www.strava.com/api/v3/athlete/activities");
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("page", String(page));
      if (after) url.searchParams.set("after", String(after));

      const stravaRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!stravaRes.ok) {
        const text = await stravaRes.text();
        throw new Error(text);
      }

      const activities = await stravaRes.json();
      if (!Array.isArray(activities) || activities.length === 0) break;

      for (const a of activities) {
        const isRun = (a.sport_type || a.type) === "Run";
        if (!isRun) continue;

        // 1) Save raw payload (Simplified: No counters, just save)
        await RawStravaActivity.findOneAndUpdate(
          {
            user: req.userId,
            provider: "strava",
            activityId: String(a.id),
          },
          {
            $setOnInsert: {
              payload: a,
              payloadVersion: 1,
              fetchedAt: new Date(),
            },
          },
          { upsert: true, new: true }, // <--- Changed: removed rawResult: true
        );

        // 2) Save curated metrics (Simplified: No counters)
        const workoutDoc = mapStravaToWorkout({ userId: req.userId, a });

        const filter = {
          user: req.userId,
          "source.provider": "strava",
          "source.activityId": String(a.id),
        };

        await Workout.findOneAndUpdate(
          filter,
          { $set: workoutDoc },
          { upsert: true, new: true }, // <--- Changed: removed rawResult: true
        );

        processed++;
      }

      if (activities.length < perPage) break;
      page++;
    }

    conn.lastSyncAt = new Date();
    await conn.save();

    res.json({
      message: "Strava sync complete",
      created,
      updated,
      processed,
      rawUpserts,
      lastSyncAt: conn.lastSyncAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// NOTE: athlete/activities returns SUMMARY payloads.
// Full detail (laps, splits, zones) can be fetched later per activity.

/**
 * GET /api/strava/connect
 * Returns Strava OAuth URL
 */
router.get("/connect", auth, async (req, res) => {
  try {
    const clientId = process.env.STRAVA_CLIENT_ID;
    const redirectURI = process.env.STRAVA_REDIRECT_URI;

    const scope = "read,activity:read_all";
    const approvalPrompt = "auto";
    const responseType = "code";

    const state = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await StravaOAuthState.create({
      user: req.userId,
      state,
      expiresAt,
    });

    const url =
      "https://www.strava.com/oauth/authorize" +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectURI)}` +
      `&response_type=${encodeURIComponent(responseType)}` +
      `&approval_prompt=${encodeURIComponent(approvalPrompt)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`;

    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/strava/callback
 * Handles OAuth redirect from Strava
 */
router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return redirectToClient(res, {
        status: "error",
        reason: "missing_params",
      });
    }

    const stateRecord = await StravaOAuthState.findOne({ state }).lean();
    if (!stateRecord) {
      return redirectToClient(res, {
        status: "error",
        reason: "invalid_state",
      });
    }

    if (stateRecord.usedAt) {
      return redirectToClient(res, { status: "error", reason: "state_used" });
    }

    if (new Date(stateRecord.expiresAt) < new Date()) {
      return redirectToClient(res, {
        status: "error",
        reason: "state_expired",
      });
    }

    const userId = stateRecord.user;

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
      return redirectToClient(res, {
        status: "error",
        reason: "token_exchange_failed",
      });
    }

    const tokenData = await tokenRes.json();

    await StravaConnection.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        athleteId: tokenData.athlete?.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_at,
        scope: tokenData.scope || "",
        connectedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    await StravaOAuthState.updateOne(
      { state },
      { $set: { usedAt: new Date() } },
    );

    res.redirect(
      (process.env.CLIENT_ORIGIN || "http://localhost:5173") +
        "/strava/connected?status=success",
    );
  } catch (err) {
    return redirectToClient(res, { status: "error", reason: "server_error" });
  }
});

export default router;

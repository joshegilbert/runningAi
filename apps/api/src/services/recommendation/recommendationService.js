import Workout from "../../models/Workout.js";
import DailyRecommendation from "../../models/DailyRecommendation.js";
import User from "../../models/User.js";
import { generateRecommendationViaLLM } from "./providers/llmProvider.js";

function startOfTodayUTC() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfTodayForTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== "string") return startOfTodayUTC();

  // Use Intl to derive local date parts in the user timezone, then anchor to UTC midnight.
  // This yields a stable "day bucket" for that timezone.
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = dtf.formatToParts(new Date());
    const y = Number(parts.find((p) => p.type === "year")?.value);
    const m = Number(parts.find((p) => p.type === "month")?.value);
    const d = Number(parts.find((p) => p.type === "day")?.value);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return startOfTodayUTC();
    }
    return new Date(Date.UTC(y, m - 1, d));
  } catch {
    return startOfTodayUTC();
  }
}

export async function getOrCreateTodayRecommendation(userId) {
  const user = await User.findById(userId).select("trainingProfile").lean();
  const trainingProfile = user?.trainingProfile || null;

  const today = startOfTodayForTimeZone(trainingProfile?.timezone);

  const existing = await DailyRecommendation.findOne({
    user: userId,
    date: today,
  }).lean();
  if (existing) return existing;

  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - 14);

  const workouts = await Workout.find({
    user: userId,
    date: { $gte: since, $lte: new Date() },
  })
    .sort({ date: -1 })
    .lean();

  const rec = await generateRecommendationViaLLM({
    workouts,
    trainingProfile,
    todayISO: today.toISOString().slice(0, 10),
  });

  const created = await DailyRecommendation.create({
    user: userId,
    date: today,
    headline: rec.headline,
    details: rec.details,
    workout: rec.workout,
    rationale: rec.rationale,
    fallback: rec.fallback,
    meta: rec.meta,
  });

  return created.toObject();
}

export async function regenerateTodayRecommendation(userId) {
  const user = await User.findById(userId).select("trainingProfile").lean();
  const today = startOfTodayForTimeZone(user?.trainingProfile?.timezone);

  await DailyRecommendation.deleteOne({ user: userId, date: today });

  // Now a fresh generate will happen
  return await getOrCreateTodayRecommendation(userId);
}

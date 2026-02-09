import Workout from "../../models/Workout.js";
import DailyRecommendation from "../../models/DailyRecommendation.js";
import { generateRecommendationViaLLM } from "./providers/llmProvider.js";

function startOfTodayUTC() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export async function getOrCreateTodayRecommendation(userId) {
  const today = startOfTodayUTC();

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

  const rec = await generateRecommendationViaLLM({ workouts });

  const created = await DailyRecommendation.create({
    user: userId,
    date: today,
    headline: rec.headline,
    details: rec.details,
    workout: rec.workout,
    meta: rec.meta,
  });

  return created.toObject();
}

export async function regenerateTodayRecommendation(userId) {
  const today = startOfTodayUTC();

  await DailyRecommendation.deleteOne({ user: userId, date: today });

  // Now a fresh generate will happen
  return await getOrCreateTodayRecommendation(userId);
}

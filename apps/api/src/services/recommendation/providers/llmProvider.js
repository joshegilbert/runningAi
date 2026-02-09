import { callLLM } from "../llmClient.js";

function metersToMiles(m) {
  return (m || 0) / 1609.34;
}

function safeNumber(n) {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function startOfTodayUTC() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function trimWorkoutsForLLM(workouts) {
  // Keep only what the model needs, and reduce size
  return workouts.slice(0, 40).map((w) => ({
    date: new Date(w.date).toISOString(),
    type: w.type, // easy/workout/long/race (your schema)
    title: w.title || "",
    distanceMiles: Number(metersToMiles(w.distanceMeters).toFixed(2)),
    durationMinutes: Math.round((w.durationSeconds || 0) / 60),
    perceivedEffort: w.perceivedEffort ?? null,
    sufferScore: w.sufferScore ?? null,
    source: w.source?.provider || "manual",
  }));
}

function coerceToCanonicalType(modelType) {
  // Map your existing schema's types into our recommendation types
  // modelType is what AI returns: easy/tempo/intervals/long/rest
  const allowed = new Set(["easy", "tempo", "intervals", "long", "rest"]);
  if (!allowed.has(modelType)) return null;
  return modelType;
}

function validateRecommendationJson(obj) {
  // Minimal validation so it can’t return something crazy
  const type = coerceToCanonicalType(obj?.workout?.type);
  if (!type) return { ok: false, error: "Invalid workout.type" };

  const duration = safeNumber(obj?.workout?.durationMinutes);
  const distance = safeNumber(obj?.workout?.distanceMiles);

  // exactly one of duration or distance unless rest
  if (type === "rest") {
    return {
      ok: true,
      value: {
        workout: { type: "rest", durationMinutes: null, distanceMiles: null },
        headline: obj?.headline || "Suggested: Rest day",
        details:
          obj?.details || "Take a rest day today. Light mobility is fine.",
      },
    };
  }

  const hasDuration = duration != null && duration > 0;
  const hasDistance = distance != null && distance > 0;

  if ((hasDuration && hasDistance) || (!hasDuration && !hasDistance)) {
    return {
      ok: false,
      error: "Provide exactly one of durationMinutes or distanceMiles",
    };
  }

  // Soft caps (keeps output sane for v1)
  if (hasDuration && (duration < 10 || duration > 120)) {
    return { ok: false, error: "durationMinutes out of bounds (10–120)" };
  }
  if (hasDistance && (distance < 1 || distance > 20)) {
    return { ok: false, error: "distanceMiles out of bounds (1–20)" };
  }

  const headline = typeof obj?.headline === "string" ? obj.headline : "";
  const details = typeof obj?.details === "string" ? obj.details : "";

  const finalHeadline =
    headline.trim() ||
    `Suggested run: ${type === "tempo" ? "Tempo" : type === "intervals" ? "Intervals" : type === "long" ? "Long" : "Easy"} — ${
      hasDuration ? `${duration} min` : `${distance} mi`
    }`;

  return {
    ok: true,
    value: {
      workout: {
        type,
        durationMinutes: hasDuration ? Math.round(duration) : null,
        distanceMiles: hasDistance ? Number(distance.toFixed(1)) : null,
      },
      headline: finalHeadline,
      details: details.trim() || "Suggested based on your recent training.",
    },
  };
}

export async function generateRecommendationViaLLM({ workouts }) {
  const today = startOfTodayUTC();

  const trimmed = trimWorkoutsForLLM(workouts);

  const system = `
You are a running coach assistant.
Return ONLY valid JSON (no markdown, no extra text).
You must choose one recommendation for TODAY.
The output must match this exact JSON shape:

{
  "workout": { "type": "easy|tempo|intervals|long|rest", "durationMinutes": number|null, "distanceMiles": number|null },
  "headline": "string",
  "details": "string"
}

Rules:
- If type is "rest": durationMinutes and distanceMiles must both be null.
- Otherwise: provide exactly ONE of durationMinutes or distanceMiles (not both, not neither).
- Keep it reasonable: duration 10–120 minutes, distance 1–20 miles.
- Use the recent workouts provided; do not mention APIs or models.
`;

  const user = {
    role: "user",
    content: JSON.stringify(
      {
        date: today.toISOString().slice(0, 10),
        recentWorkouts: trimmed,
        note: "Recommend a run for today based on the last 14 days. Keep it simple and actionable.",
      },
      null,
      2,
    ),
  };

  const { content, modelUsed } = await callLLM({
    messages: [{ role: "system", content: system.trim() }, user],
    temperature: 0.6,
  });

  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`LLM did not return valid JSON: ${content.slice(0, 300)}`);
  }

  const validated = validateRecommendationJson(parsed);
  if (!validated.ok) {
    throw new Error(`LLM JSON failed validation: ${validated.error}`);
  }

  return {
    ...validated.value,
    meta: {
      provider: "llm",
      model: modelUsed,
      inputs: { recentWorkoutsCount: trimmed.length },
      raw: content,
    },
  };
}

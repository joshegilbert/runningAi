import { callLLMWithRetry } from "../llmClient.js";

function metersToMiles(m) {
  return (m || 0) / 1609.34;
}

function mpsToPaceMinPerMile(mps) {
  if (typeof mps !== "number" || !Number.isFinite(mps) || mps <= 0) return null;
  const secPerMile = 1609.34 / mps;
  return Number((secPerMile / 60).toFixed(2));
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

function clampString(s, maxLen) {
  if (typeof s !== "string") return "";
  const trimmed = s.trim();
  if (!trimmed) return "";
  return trimmed.length <= maxLen ? trimmed : `${trimmed.slice(0, maxLen - 1)}…`;
}

function trimWorkoutsForLLM(workouts) {
  // Keep only what the model needs, and reduce size
  return workouts.slice(0, 40).map((w) => ({
    date: new Date(w.date).toISOString(),
    type: w.type, // easy/workout/long/race (your schema)
    title: w.title || "",
    notes: clampString(w.notes || "", 200),
    distanceMiles: Number(metersToMiles(w.distanceMeters).toFixed(2)),
    durationMinutes: Math.round((w.durationSeconds || 0) / 60),
    perceivedEffort: w.perceivedEffort ?? null,
    sufferScore: w.sufferScore ?? null,
    avgPaceMinPerMile: mpsToPaceMinPerMile(w.avgSpeedMps),
    avgHeartRateBpm: w.avgHeartRateBpm ?? null,
    maxHeartRateBpm: w.maxHeartRateBpm ?? null,
    elevationGainM: w.elevationGainM ?? null,
    source: w.source?.provider || "manual",
  }));
}

function summarizeTrainingLoad(workouts) {
  const now = new Date();
  const msDay = 24 * 60 * 60 * 1000;

  const inLastNDays = (w, n) => {
    const d = new Date(w.date);
    return now - d <= n * msDay;
  };

  const last7 = workouts.filter((w) => inLastNDays(w, 7));
  const last14 = workouts.filter((w) => inLastNDays(w, 14));

  const sumMiles = (arr) =>
    arr.reduce((acc, w) => acc + metersToMiles(w.distanceMeters || 0), 0);
  const sumMinutes = (arr) =>
    arr.reduce((acc, w) => acc + Math.round((w.durationSeconds || 0) / 60), 0);

  const longest14Miles = last14.reduce((max, w) => {
    const mi = metersToMiles(w.distanceMeters || 0);
    return mi > max ? mi : max;
  }, 0);

  const isHard = (w) => w?.type === "workout" || w?.type === "race";
  const hardSorted = workouts
    .filter(isHard)
    .map((w) => new Date(w.date))
    .sort((a, b) => b - a);
  const lastHardDate = hardSorted[0] || null;
  const daysSinceHard = lastHardDate
    ? Math.floor((now - lastHardDate) / msDay)
    : null;

  return {
    last7: {
      workouts: last7.length,
      totalMiles: Number(sumMiles(last7).toFixed(1)),
      totalMinutes: sumMinutes(last7),
    },
    last14: {
      workouts: last14.length,
      totalMiles: Number(sumMiles(last14).toFixed(1)),
      totalMinutes: sumMinutes(last14),
      longestRunMiles: Number(longest14Miles.toFixed(1)),
    },
    daysSinceHard,
    lastHardISO: lastHardDate ? lastHardDate.toISOString().slice(0, 10) : null,
  };
}

function coerceToCanonicalType(modelType) {
  // Map your existing schema's types into our recommendation types
  // modelType is what AI returns: easy/tempo/intervals/long/rest
  const allowed = new Set(["easy", "tempo", "intervals", "long", "rest"]);
  if (!allowed.has(modelType)) return null;
  return modelType;
}

function pickTargets(targets) {
  const t = targets && typeof targets === "object" ? targets : {};
  const rpeLow = safeNumber(t.rpeLow);
  const rpeHigh = safeNumber(t.rpeHigh);
  const hrBpmLow = safeNumber(t.hrBpmLow);
  const hrBpmHigh = safeNumber(t.hrBpmHigh);
  const paceMinPerMileLow = safeNumber(t.paceMinPerMileLow);
  const paceMinPerMileHigh = safeNumber(t.paceMinPerMileHigh);

  return {
    rpeLow,
    rpeHigh,
    hrBpmLow,
    hrBpmHigh,
    paceMinPerMileLow,
    paceMinPerMileHigh,
  };
}

function sumSteps(steps) {
  if (!Array.isArray(steps)) return { minutes: null, miles: null };
  let minutes = 0;
  let miles = 0;
  let hasMinutes = false;
  let hasMiles = false;

  for (const s of steps) {
    const m = safeNumber(s?.durationMinutes);
    const d = safeNumber(s?.distanceMiles);
    if (m != null && m > 0) {
      minutes += m;
      hasMinutes = true;
    }
    if (d != null && d > 0) {
      miles += d;
      hasMiles = true;
    }
  }

  return {
    minutes: hasMinutes ? minutes : null,
    miles: hasMiles ? miles : null,
  };
}

function normalizeSteps(rawSteps) {
  if (!Array.isArray(rawSteps)) return undefined;
  const steps = rawSteps
    .filter((s) => s && typeof s === "object")
    .slice(0, 12)
    .map((s) => ({
      label: clampString(s.label || "", 40),
      durationMinutes: safeNumber(s.durationMinutes),
      distanceMiles: safeNumber(s.distanceMiles),
      target: pickTargets(s.target),
      notes: clampString(s.notes || "", 300),
    }));

  return steps.length > 0 ? steps : undefined;
}

function validateRecommendationJson(obj, { maxDurationMinutes } = {}) {
  // Minimal validation so it can’t return something crazy
  const type = coerceToCanonicalType(obj?.workout?.type);
  if (!type) return { ok: false, error: "Invalid workout.type" };

  const duration = safeNumber(obj?.workout?.durationMinutes);
  const distance = safeNumber(obj?.workout?.distanceMiles);
  const targets = pickTargets(obj?.workout?.targets);
  const steps = normalizeSteps(obj?.workout?.steps);

  // exactly one of duration or distance unless rest
  if (type === "rest") {
    return {
      ok: true,
      value: {
        workout: {
          type: "rest",
          durationMinutes: null,
          distanceMiles: null,
          steps: undefined,
          targets: {},
        },
        headline: obj?.headline || "Suggested: Rest day",
        details:
          obj?.details || "Take a rest day today. Light mobility is fine.",
        rationale: Array.isArray(obj?.rationale)
          ? obj.rationale.slice(0, 6).map((s) => clampString(String(s), 160))
          : undefined,
        fallback: {
          type: "easy",
          durationMinutes: 20,
          distanceMiles: null,
          notes: "If you feel stiff, do 15–20 minutes very easy + mobility.",
        },
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
  if (hasDuration && maxDurationMinutes && duration > maxDurationMinutes) {
    return { ok: false, error: "durationMinutes exceeds availability" };
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

  // If the model included steps, ensure they roughly match the total (when comparable)
  const stepTotals = sumSteps(steps);
  if (steps && hasDuration && stepTotals.minutes != null) {
    const diff = Math.abs(stepTotals.minutes - duration);
    if (diff > 8) return { ok: false, error: "steps do not sum to duration" };
  }
  if (steps && hasDistance && stepTotals.miles != null) {
    const diff = Math.abs(stepTotals.miles - distance);
    if (diff > 1.5) return { ok: false, error: "steps do not sum to distance" };
  }

  const rationale = Array.isArray(obj?.rationale)
    ? obj.rationale
        .filter((x) => typeof x === "string" || typeof x === "number")
        .slice(0, 6)
        .map((s) => clampString(String(s), 160))
    : undefined;

  // Fallback must be strictly easier/shorter
  const fbType = coerceToCanonicalType(obj?.fallback?.type) || "easy";
  const fbDur = safeNumber(obj?.fallback?.durationMinutes);
  const fbDist = safeNumber(obj?.fallback?.distanceMiles);
  const fbHasDur = fbDur != null && fbDur > 0;
  const fbHasDist = fbDist != null && fbDist > 0;
  const fbNotes = clampString(obj?.fallback?.notes || "", 800);

  if (fbType === "rest") {
    // ok: rest fallback
  } else if ((fbHasDur && fbHasDist) || (!fbHasDur && !fbHasDist)) {
    return { ok: false, error: "fallback must provide duration OR distance" };
  }

  if (hasDuration && fbHasDur && fbDur >= duration) {
    return { ok: false, error: "fallback duration must be shorter than primary" };
  }
  if (hasDistance && fbHasDist && fbDist >= distance) {
    return { ok: false, error: "fallback distance must be shorter than primary" };
  }

  return {
    ok: true,
    value: {
      workout: {
        type,
        durationMinutes: hasDuration ? Math.round(duration) : null,
        distanceMiles: hasDistance ? Number(distance.toFixed(1)) : null,
        steps,
        targets,
      },
      headline: finalHeadline,
      details:
        details.trim() ||
        "Suggested based on your recent training and today's constraints.",
      rationale,
      fallback: {
        type: fbType,
        durationMinutes: fbHasDur ? Math.round(fbDur) : null,
        distanceMiles: fbHasDist ? Number(fbDist.toFixed(1)) : null,
        notes: fbNotes || "If you’re short on time or feeling flat: do an easier shorter run.",
      },
    },
  };
}

function parseJsonLenient(content) {
  try {
    return { ok: true, value: JSON.parse(content) };
  } catch {
    // Try extracting the first JSON object
    const match = content && content.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, error: "No JSON object found" };
    try {
      return { ok: true, value: JSON.parse(match[0]) };
    } catch (e) {
      return { ok: false, error: "Failed to parse extracted JSON" };
    }
  }
}

function targetsFromProfileEasy(trainingProfile) {
  const e = trainingProfile?.zones?.easy;
  if (!e) return {};
  const low = safeNumber(e.paceMinPerMileLow);
  const high = safeNumber(e.paceMinPerMileHigh);
  const hrLo = safeNumber(e.hrBpmLow);
  const hrHi = safeNumber(e.hrBpmHigh);
  const t = {};
  if (low != null && high != null) {
    t.paceMinPerMileLow = low;
    t.paceMinPerMileHigh = high;
  }
  if (hrLo != null && hrHi != null) {
    t.hrBpmLow = hrLo;
    t.hrBpmHigh = hrHi;
  }
  return pickTargets(t);
}

function buildDeterministicFallback({
  loadSummary,
  maxDurationMinutes,
  trainingProfile,
  todayISO,
  reason,
}) {
  let duration = 30;
  const miles7 = loadSummary?.last7?.totalMiles ?? 0;
  if (miles7 > 35) duration = 25;
  else if (miles7 < 5) duration = 25;

  if (maxDurationMinutes != null) {
    duration = Math.min(duration, maxDurationMinutes);
  }
  duration = Math.max(10, Math.min(120, Math.round(duration)));

  const daysHard = loadSummary?.daysSinceHard;
  if (daysHard != null && daysHard < 2) {
    duration = Math.min(duration, maxDurationMinutes ?? 35, 30);
  }

  const fbDur = Math.max(10, Math.round(duration * 0.55));

  const easyTargets = targetsFromProfileEasy(trainingProfile);

  const obj = {
    workout: {
      type: "easy",
      durationMinutes: duration,
      distanceMiles: null,
      steps: undefined,
      targets: easyTargets,
    },
    headline: "Easy run (offline suggestion)",
    details:
      "We couldn’t reach the AI coach just now. Here’s a safe, conservative easy run you can do today. Tap refresh later for a personalized plan.",
    rationale: [
      "Offline fallback while the coach service is unavailable.",
      loadSummary?.last14?.workouts != null
        ? `Last 14 days: ${loadSummary.last14.workouts} run(s) logged, ~${loadSummary.last14.totalMiles} mi.`
        : "Keep logging runs so the coach can tailor future days.",
    ],
    fallback: {
      type: "easy",
      durationMinutes: fbDur,
      distanceMiles: null,
      notes:
        "If you’re tired or short on time: shorten to this easier option and keep effort conversational.",
    },
  };

  let validated = validateRecommendationJson(obj, { maxDurationMinutes });
  if (!validated.ok) {
    const minimal = {
      workout: { type: "easy", durationMinutes: 20, distanceMiles: null },
      headline: "Easy 20 minutes",
      details: "Offline suggestion — keep effort easy.",
      rationale: ["Offline fallback."],
      fallback: {
        type: "easy",
        durationMinutes: 12,
        distanceMiles: null,
        notes: "Very easy 10–12 minutes if needed.",
      },
    };
    validated = validateRecommendationJson(minimal, { maxDurationMinutes });
  }

  if (!validated.ok) {
    throw new Error(`Fallback validation failed: ${validated.error}`);
  }

  return {
    ...validated.value,
    meta: {
      provider: "fallback",
      model: "",
      fallbackReason: String(reason?.message || reason || "unknown"),
      inputs: {
        promptVersion: String(process.env.PROMPT_VERSION || "v2"),
        date: todayISO,
        loadSummary,
        hasTrainingProfile: Boolean(trainingProfile),
      },
      raw: "",
    },
  };
}

async function generateRecommendationViaLlmInner({
  workouts,
  trainingProfile,
  todayISO,
}) {
  const today = startOfTodayUTC();
  const dateISO = todayISO || today.toISOString().slice(0, 10);

  const trimmed = trimWorkoutsForLLM(workouts);
  const loadSummary = summarizeTrainingLoad(workouts);

  const maxDurationMinutes =
    safeNumber(trainingProfile?.availability?.timePerDayMinutes) ?? null;

  const user = {
    role: "user",
    content: JSON.stringify(
      {
        date: dateISO,
        trainingProfile: trainingProfile || null,
        loadSummary,
        recentWorkouts: trimmed,
        note: "Recommend a run for today. Make it specific: include targets and a fallback option.",
      },
      null,
      2,
    ),
  };

  const responseFormat =
    String(process.env.LLM_RESPONSE_FORMAT || "").toLowerCase() === "json_object"
      ? { type: "json_object" }
      : undefined;

  const { content, modelUsed } = await callLLMWithRetry(
    {
      messages: [{ role: "system", content: coachSystemPromptV2().trim() }, user],
      temperature: 0.6,
      responseFormat,
    },
    { attempts: 2 },
  );

  let finalRaw = content;

  const parsed1 = parseJsonLenient(content);
  if (!parsed1.ok) {
    throw new Error(`LLM did not return valid JSON: ${content.slice(0, 300)}`);
  }

  let validated = validateRecommendationJson(parsed1.value, {
    maxDurationMinutes,
  });
  if (!validated.ok) {
    const repairSystem = `
You fix JSON outputs to satisfy a schema and constraints.
Return ONLY valid JSON (no markdown, no extra text).
Keep the meaning as close as possible but fix invalid fields/rules.
`;
    const repairUser = {
      role: "user",
      content: JSON.stringify(
        {
          error: validated.error,
          constraints: { maxDurationMinutes },
          schemaHint: "Use the same schema as the coach output.",
          previousOutput: content,
        },
        null,
        2,
      ),
    };

    const repaired = await callLLMWithRetry(
      {
        messages: [
          { role: "system", content: repairSystem.trim() },
          { role: "system", content: coachSystemPromptV2().trim() },
          repairUser,
        ],
        temperature: 0.2,
        responseFormat,
      },
      { attempts: 2 },
    );

    finalRaw = repaired.content;

    const parsed2 = parseJsonLenient(repaired.content);
    if (!parsed2.ok) {
      throw new Error(
        `LLM JSON failed validation (${validated.error}) and repair returned invalid JSON`,
      );
    }

    validated = validateRecommendationJson(parsed2.value, { maxDurationMinutes });
    if (!validated.ok) {
      throw new Error(`LLM JSON failed validation: ${validated.error}`);
    }
  }

  return {
    ...validated.value,
    meta: {
      provider: "llm",
      model: modelUsed,
      inputs: {
        promptVersion: String(process.env.PROMPT_VERSION || "v2"),
        recentWorkoutsCount: trimmed.length,
        loadSummary,
        hasTrainingProfile: Boolean(trainingProfile),
      },
      raw: finalRaw,
    },
  };
}

function coachSystemPromptV2() {
  return `
You are a high-quality running coach.
Return ONLY valid JSON (no markdown, no extra text).
You must choose one recommendation for TODAY.

You must tailor the workout to:
- The athlete's experienceLevel
- Availability (timePerDayMinutes, daysPerWeek, constraints)
- Training zones (pace/HR when provided)
- Recent training load (7/14 day volume, days since hard)

Be specific and prescriptive:
- Include warmup/main/cooldown steps when it helps clarity
- Provide targets using paceMinPerMile and/or hrBpm and/or RPE
- Include 2–4 rationale bullets tied to recent workouts/load
- Always include a fallback option that is easier/shorter

Output must match this exact JSON shape:
{
  "workout": {
    "type": "easy|tempo|intervals|long|rest",
    "durationMinutes": number|null,
    "distanceMiles": number|null,
    "steps": [
      {
        "label": "string",
        "durationMinutes": number|null,
        "distanceMiles": number|null,
        "target": {
          "rpeLow": number|null,
          "rpeHigh": number|null,
          "hrBpmLow": number|null,
          "hrBpmHigh": number|null,
          "paceMinPerMileLow": number|null,
          "paceMinPerMileHigh": number|null
        },
        "notes": "string"
      }
    ],
    "targets": {
      "rpeLow": number|null,
      "rpeHigh": number|null,
      "hrBpmLow": number|null,
      "hrBpmHigh": number|null,
      "paceMinPerMileLow": number|null,
      "paceMinPerMileHigh": number|null
    }
  },
  "headline": "string",
  "details": "string",
  "rationale": ["string"],
  "fallback": {
    "type": "easy|tempo|intervals|long|rest",
    "durationMinutes": number|null,
    "distanceMiles": number|null,
    "notes": "string"
  }
}

Rules:
- If workout.type is "rest": workout.durationMinutes and workout.distanceMiles must both be null.
- Otherwise: provide exactly ONE of workout.durationMinutes or workout.distanceMiles (not both, not neither).
- Keep it reasonable: duration 10–120 minutes, distance 1–20 miles.
- If availability.timePerDayMinutes is set, do not exceed it.
- The fallback must be strictly easier/shorter than the primary workout (or "rest").
- Do not mention APIs, models, or JSON.
`;
}

export async function generateRecommendationViaLLM({
  workouts,
  trainingProfile,
  todayISO,
}) {
  const loadSummary = summarizeTrainingLoad(workouts);
  const maxDurationMinutes =
    safeNumber(trainingProfile?.availability?.timePerDayMinutes) ?? null;

  try {
    return await generateRecommendationViaLlmInner({
      workouts,
      trainingProfile,
      todayISO,
    });
  } catch (err) {
    console.error("generateRecommendationViaLLM failed, using fallback:", err);
    return buildDeterministicFallback({
      loadSummary,
      maxDurationMinutes,
      trainingProfile,
      todayISO:
        todayISO ||
        startOfTodayUTC().toISOString().slice(0, 10),
      reason: err,
    });
  }
}

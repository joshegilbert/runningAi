import { generateRecommendationViaLLM } from "../providers/llmProvider.js";
import { goldenSet } from "./goldenSet.js";

async function run() {
  const results = [];

  for (const c of goldenSet) {
    const started = Date.now();
    try {
      const rec = await generateRecommendationViaLLM({
        workouts: c.workouts,
        trainingProfile: c.trainingProfile,
        todayISO: new Date().toISOString().slice(0, 10),
      });

      results.push({
        name: c.name,
        ok: true,
        ms: Date.now() - started,
        headline: rec.headline,
        workout: rec.workout,
        fallback: rec.fallback,
        rationale: rec.rationale,
        meta: rec.meta,
      });
    } catch (err) {
      results.push({
        name: c.name,
        ok: false,
        ms: Date.now() - started,
        error: err?.message || String(err),
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exitCode = 1;
});


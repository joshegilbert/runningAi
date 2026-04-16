<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import MainLayout from "../layouts/MainLayout.vue";
import { useRecommendationStore } from "../stores/recommendation";

const router = useRouter();
const recommendationStore = useRecommendationStore();

function paceMinToString(minPerMile) {
  const n = Number(minPerMile);
  if (!Number.isFinite(n) || n <= 0) return "";
  const m = Math.floor(n);
  const s = Math.round((n - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatRecChip(rec) {
  if (!rec?.workout) return "";
  const w = rec.workout;
  const amount = w.durationMinutes
    ? `${w.durationMinutes} min`
    : w.distanceMiles
      ? `${w.distanceMiles} mi`
      : "Rest";
  return `${amount} • ${w.type}`;
}

const targetsLine = computed(() => {
  const rec = recommendationStore.today;
  const t = rec?.workout?.targets;
  if (!t) return "";
  const parts = [];
  if (t.paceMinPerMileLow && t.paceMinPerMileHigh) {
    const low = paceMinToString(t.paceMinPerMileLow);
    const high = paceMinToString(t.paceMinPerMileHigh);
    if (low && high) parts.push(`Pace ${low}–${high}/mi`);
  }
  if (t.hrBpmLow && t.hrBpmHigh)
    parts.push(`HR ${t.hrBpmLow}–${t.hrBpmHigh} bpm`);
  if (t.rpeLow && t.rpeHigh) parts.push(`RPE ${t.rpeLow}–${t.rpeHigh}`);
  return parts.join(" • ");
});

const fallbackLine = computed(() => {
  const fb = recommendationStore.today?.fallback;
  if (!fb) return "";
  const amount = fb.durationMinutes
    ? `${fb.durationMinutes} min`
    : fb.distanceMiles
      ? `${fb.distanceMiles} mi`
      : fb.type === "rest"
        ? "Rest"
        : "";
  if (!amount) return "";
  return `${amount} • ${fb.type || "easy"}`;
});

const isOfflineFallback = computed(
  () => recommendationStore.today?.meta?.provider === "fallback",
);

onMounted(() => {
  recommendationStore.fetchToday();
});
</script>

<template>
  <MainLayout>
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            @click="router.push('/dashboard')"
            class="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 mb-2"
          >
            &larr; Dashboard
          </button>
          <h1 class="text-2xl font-bold text-slate-900">Daily workout</h1>
          <p class="text-slate-500 text-sm mt-1">
            Full plan for today’s recommendation.
          </p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <button
            type="button"
            @click="recommendationStore.fetchToday()"
            :disabled="recommendationStore.isLoading"
            class="text-xs font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            {{ recommendationStore.isLoading ? "Loading…" : "Refresh" }}
          </button>
          <button
            type="button"
            @click="router.push('/profile')"
            class="text-xs font-semibold text-indigo-600 hover:underline"
          >
            Edit training profile
          </button>
        </div>
      </div>

      <div
        v-if="isOfflineFallback"
        class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm"
      >
        <p class="font-semibold">Offline suggestion</p>
        <p class="mt-1 text-amber-800/90">
          The AI coach couldn’t be reached. Showing a safe default run. Try
          refresh in a moment for a personalized plan.
        </p>
      </div>

      <div v-if="recommendationStore.error" class="text-red-600 text-sm">
        {{ recommendationStore.error }}
      </div>

      <div
        v-else-if="recommendationStore.isLoading && !recommendationStore.today"
        class="space-y-3"
      >
        <div class="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
        <div class="h-40 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>

      <div v-else-if="!recommendationStore.today" class="text-slate-500 text-sm">
        No recommendation yet. Tap Refresh.
      </div>

      <div v-else class="space-y-6">
        <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
          >
            Today
          </p>
          <h2 class="text-xl font-black text-slate-900 mt-2">
            {{ recommendationStore.today.headline }}
          </h2>
          <p class="text-slate-600 text-sm mt-2 leading-relaxed">
            {{ recommendationStore.today.details }}
          </p>
          <p class="text-xs text-slate-500 mt-3 font-mono">
            {{ formatRecChip(recommendationStore.today) }}
          </p>
        </div>

        <div
          v-if="targetsLine"
          class="bg-slate-50 rounded-xl border border-slate-200 p-5"
        >
          <div
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
          >
            Targets
          </div>
          <p class="text-slate-800 mt-2">{{ targetsLine }}</p>
        </div>

        <div
          v-if="recommendationStore.today?.workout?.steps?.length"
          class="space-y-3"
        >
          <div
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
          >
            Steps
          </div>
          <div class="space-y-3">
            <div
              v-for="(s, idx) in recommendationStore.today.workout.steps"
              :key="idx"
              class="bg-white rounded-xl border border-slate-200 p-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="font-bold text-slate-900">
                  {{ s.label || "Step" }}
                </div>
                <div class="text-xs font-mono text-slate-600">
                  {{
                    s.durationMinutes
                      ? `${s.durationMinutes} min`
                      : s.distanceMiles
                        ? `${s.distanceMiles} mi`
                        : ""
                  }}
                </div>
              </div>
              <div v-if="s.target" class="text-sm text-slate-600 mt-2">
                <span
                  v-if="s.target.paceMinPerMileLow && s.target.paceMinPerMileHigh"
                >
                  Pace
                  {{ paceMinToString(s.target.paceMinPerMileLow) }}–{{
                    paceMinToString(s.target.paceMinPerMileHigh)
                  }}/mi
                </span>
                <span v-if="s.target.hrBpmLow && s.target.hrBpmHigh">
                  <span
                    v-if="
                      s.target.paceMinPerMileLow && s.target.paceMinPerMileHigh
                    "
                  >
                    •
                  </span>
                  HR {{ s.target.hrBpmLow }}–{{ s.target.hrBpmHigh }} bpm
                </span>
                <span v-if="s.target.rpeLow && s.target.rpeHigh">
                  <span
                    v-if="
                      (s.target.paceMinPerMileLow &&
                        s.target.paceMinPerMileHigh) ||
                      (s.target.hrBpmLow && s.target.hrBpmHigh)
                    "
                  >
                    •
                  </span>
                  RPE {{ s.target.rpeLow }}–{{ s.target.rpeHigh }}
                </span>
              </div>
              <div v-if="s.notes" class="text-sm text-slate-600 mt-2">
                {{ s.notes }}
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="recommendationStore.today?.rationale?.length"
          class="space-y-2"
        >
          <div
            class="text-xs font-bold text-slate-400 uppercase tracking-widest"
          >
            Why this
          </div>
          <ul class="space-y-2">
            <li
              v-for="(r, idx) in recommendationStore.today.rationale"
              :key="idx"
              class="text-slate-700 flex gap-2 text-sm"
            >
              <span class="text-slate-400">•</span>
              <span>{{ r }}</span>
            </li>
          </ul>
        </div>

        <div
          v-if="recommendationStore.today?.fallback"
          class="bg-amber-50 rounded-xl border border-amber-100 p-5"
        >
          <div
            class="text-xs font-bold text-amber-800 uppercase tracking-widest"
          >
            Fallback
          </div>
          <p class="text-amber-950 font-semibold mt-2">{{ fallbackLine }}</p>
          <p
            v-if="recommendationStore.today.fallback?.notes"
            class="text-sm text-amber-900/85 mt-2"
          >
            {{ recommendationStore.today.fallback.notes }}
          </p>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

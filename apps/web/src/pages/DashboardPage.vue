<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWorkoutStore } from "../stores/workout";
import MainLayout from "../layouts/MainLayout.vue";
import { useRecommendationStore } from "../stores/recommendation";

const router = useRouter();
const auth = useAuthStore();
const workoutStore = useWorkoutStore();
const recommendationStore = useRecommendationStore();
const showCoachPlan = ref(false);

// --- HELPERS ---
function goToLogWorkout() {
  router.push("/workouts/new");
}

function goToHistory() {
  router.push("/workouts");
}

function goToProfile() {
  router.push("/profile");
}

function meterToMiles(meters) {
  return (meters / 1609.34).toFixed(2);
}

function formatPace(meters, seconds) {
  if (!meters || meters === 0) return "-:--";
  const miles = meters / 1609.34;
  const paceDec = seconds / 60 / miles;
  const pMin = Math.floor(paceDec);
  const pSec = Math.round((paceDec - pMin) * 60);
  return `${pMin}:${pSec.toString().padStart(2, "0")}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  if (t.hrBpmLow && t.hrBpmHigh) parts.push(`HR ${t.hrBpmLow}–${t.hrBpmHigh} bpm`);
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

// --- LOGIC: WEEKLY STATS ---
const thisWeeksWorkouts = computed(() => {
  if (!workoutStore.workouts.length) return [];
  const now = new Date();
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - distanceToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  // Sort by date ascending for the chart
  return workoutStore.workouts
    .filter((w) => new Date(w.date) >= startOfWeek)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
});

const weeklyVolume = computed(() => {
  const totalMeters = thisWeeksWorkouts.value.reduce(
    (acc, curr) => acc + (curr.distanceMeters || 0),
    0,
  );
  return meterToMiles(totalMeters);
});

// Dynamic Scaling: Find the longest run this week to set the "100%" height
const maxRunDistance = computed(() => {
  if (!thisWeeksWorkouts.value.length) return 1; // Avoid divide by zero
  return Math.max(...thisWeeksWorkouts.value.map((r) => r.distanceMeters));
});

const recentActivity = computed(() => {
  return workoutStore.workouts.slice(0, 3);
});

// --- ACTIONS ---
function handleSyncClick() {
  if (workoutStore.isConnected) {
    workoutStore.syncStrava();
  } else {
    workoutStore.connectToStrava();
  }
}

onMounted(() => {
  workoutStore.fetchStatus();
  workoutStore.fetchWorkouts();
  recommendationStore.fetchToday();
});
</script>

<template>
  <MainLayout>
    <div class="max-w-5xl mx-auto space-y-8">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-6"
      >
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Training Overview</h1>
          <p class="text-slate-500 text-sm">
            {{
              new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Sync (only when connected) -->
          <div v-if="workoutStore.isConnected" class="flex flex-col items-end">
            <button
              @click="handleSyncClick"
              :disabled="workoutStore.isSyncing"
              class="text-xs font-medium transition-colors flex items-center gap-2 px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <span v-if="workoutStore.isSyncing" class="animate-spin">↻</span>
              <span v-else>Sync latest runs</span>
            </button>

            <span
              v-if="workoutStore.lastSyncDate"
              class="text-[10px] text-slate-400 mt-1 mr-1"
            >
              Last synced {{ formatTime(workoutStore.lastSyncDate) }}
            </span>
          </div>

          <!-- Primary CTA -->
          <button
            @click="goToLogWorkout"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-indigo-200"
          >
            + Log Run
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div class="md:col-span-8 space-y-8">
          <div
            class="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex items-center justify-between relative overflow-hidden"
          >
            <div class="relative z-10">
              <p
                class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2"
              >
                This Week
              </p>
              <div class="flex items-baseline gap-2">
                <span
                  class="text-6xl font-black text-slate-900 tracking-tighter"
                >
                  {{ weeklyVolume }}
                </span>
                <span class="text-xl font-medium text-slate-500">miles</span>
              </div>
            </div>

            <div class="hidden sm:flex gap-1 items-end h-24 w-1/2 relative">
              <div
                class="text-[10px] uppercase font-bold text-slate-300 mb-1 w-full text-center absolute -top-6 left-0"
              >
                Volume Distribution
              </div>

              <div
                v-if="thisWeeksWorkouts.length === 0"
                class="text-slate-400 text-sm italic w-full text-center self-center"
              >
                No runs yet
              </div>

              <div
                v-for="run in thisWeeksWorkouts"
                :key="run._id"
                class="flex-1 bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-all relative group"
                :style="{
                  height: (run.distanceMeters / maxRunDistance) * 100 + '%',
                }"
              >
                <div
                  class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none"
                >
                  {{ meterToMiles(run.distanceMeters) }} mi
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-slate-900">Latest Sessions</h3>
              <button
                @click="goToHistory"
                class="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-wide"
              >
                View All History
              </button>
            </div>

            <div v-if="workoutStore.isLoadingWorkouts" class="space-y-3">
              <div class="h-20 bg-slate-50 rounded-xl animate-pulse"></div>
              <div class="h-20 bg-slate-50 rounded-xl animate-pulse"></div>
            </div>

            <div v-else-if="recentActivity.length > 0" class="space-y-3">
              <div
                v-for="run in recentActivity"
                :key="run._id"
                class="group bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 transition-colors flex items-center justify-between cursor-pointer"
                @click="router.push(`workouts/${run._id}`)"
              >
                <div class="flex items-center gap-4">
                  <div class="text-center w-12 flex-shrink-0">
                    <div class="text-xs font-bold text-slate-400 uppercase">
                      {{ getDayName(run.date) }}
                    </div>
                    <div class="text-lg font-bold text-slate-900">
                      {{ new Date(run.date).getDate() }}
                    </div>
                  </div>

                  <div>
                    <div
                      class="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors"
                    >
                      {{ run.title || "Run" }}
                    </div>
                    <div
                      class="text-xs text-slate-500 capitalize flex items-center gap-2"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full"
                        :class="
                          run.type === 'long'
                            ? 'bg-purple-500'
                            : 'bg-emerald-500'
                        "
                      ></span>
                      {{ run.type }} Run
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-4 sm:gap-6 text-right">
                  <div>
                    <div class="text-sm font-bold text-slate-900">
                      {{ meterToMiles(run.distanceMeters) }} mi
                    </div>
                  </div>
                  <div class="hidden sm:block">
                    <div class="text-sm font-mono text-slate-600">
                      {{
                        formatPace(run.distanceMeters, run.durationSeconds)
                      }}/mi
                    </div>
                  </div>
                  <div class="hidden sm:block">
                    <div class="text-sm text-slate-500">
                      {{ formatDuration(run.durationSeconds) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm"
            >
              No runs recorded.
              <span
                @click="goToLogWorkout"
                class="text-indigo-600 cursor-pointer hover:underline"
              >
                Log one now
              </span>
              .
            </div>
          </div>
        </div>

        <div class="md:col-span-4 space-y-6">
          <div
            class="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
          >
            <div
              class="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-30"
            ></div>

            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <div class="p-1.5 bg-indigo-800 rounded-md">
                    <svg
                      class="w-4 h-4 text-yellow-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>

                  <span
                    class="text-xs font-bold uppercase tracking-widest text-indigo-300"
                  >
                    Coach Insight
                  </span>
                </div>

                <button
                  @click="recommendationStore.fetchToday()"
                  :disabled="recommendationStore.isLoading"
                  class="text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-700 bg-indigo-800/50 hover:bg-indigo-800 transition-colors disabled:opacity-60"
                >
                  {{
                    recommendationStore.isLoading
                      ? "Loading..."
                      : recommendationStore.today
                        ? "Refresh"
                        : "Get"
                  }}
                </button>
              </div>

              <div
                v-if="recommendationStore.error"
                class="text-sm text-red-200"
              >
                {{ recommendationStore.error }}
              </div>

              <div
                v-else-if="!recommendationStore.today"
                class="text-indigo-200 text-sm leading-relaxed"
              >
                Tap
                <span class="font-semibold text-white">Get</span>
                to see today’s recommended run.
              </div>

              <div v-else class="space-y-2">
                <h4 class="font-bold text-lg leading-tight">
                  {{ recommendationStore.today.headline }}
                </h4>

                <p class="text-indigo-200 text-xs leading-relaxed">
                  {{ recommendationStore.today.details }}
                </p>

                <div class="pt-2">
                  <div
                    class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/50 border border-indigo-700 text-indigo-100 text-[10px] font-bold uppercase tracking-widest"
                  >
                    {{ formatRecChip(recommendationStore.today) }}
                  </div>
                </div>

                <div v-if="targetsLine" class="text-indigo-100/90 text-[11px] leading-relaxed">
                  <span class="font-bold text-indigo-200 uppercase tracking-widest mr-2">
                    Targets
                  </span>
                  {{ targetsLine }}
                </div>

                <div v-if="fallbackLine" class="text-indigo-100/90 text-[11px] leading-relaxed">
                  <span class="font-bold text-indigo-200 uppercase tracking-widest mr-2">
                    Fallback
                  </span>
                  {{ fallbackLine }}
                </div>

                <div class="pt-3 flex items-center gap-2">
                  <button
                    @click="showCoachPlan = true"
                    class="text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-indigo-700 bg-indigo-800/50 hover:bg-indigo-800 transition-colors"
                  >
                    View plan
                  </button>
                  <button
                    @click="goToProfile"
                    class="text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-indigo-700 bg-indigo-800/20 hover:bg-indigo-800/40 transition-colors"
                  >
                    Edit profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-9 h-9 bg-[#FC4C02] rounded-md flex items-center justify-center text-white font-bold text-sm"
                >
                  S
                </div>

                <div>
                  <span
                    class="block text-sm font-semibold text-slate-800 leading-none"
                  >
                    Strava
                  </span>

                  <span class="text-[11px] text-slate-400">
                    {{
                      workoutStore.isConnected ? "Connected" : "Not connected"
                    }}
                  </span>
                </div>
              </div>

              <!-- Connected status indicator -->
              <div
                v-if="workoutStore.isConnected"
                class="w-2.5 h-2.5 bg-emerald-500 rounded-full"
                title="Connected"
              ></div>
            </div>

            <!-- Divider -->
            <div class="border-t border-slate-100 my-3"></div>

            <!-- Not connected state -->
            <div v-if="!workoutStore.isConnected" class="space-y-2">
              <p class="text-xs text-slate-500 leading-relaxed">
                Connect your Strava account to automatically import runs and
                track your training progress.
              </p>

              <button
                @click="workoutStore.connectToStrava()"
                class="w-full bg-[#FC4C02] hover:bg-[#e64500] text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                Connect Strava
              </button>
            </div>

            <!-- Connected state -->
            <div v-else class="space-y-1">
              <p class="text-xs text-slate-500">
                Your Strava account is linked.
              </p>

              <p
                v-if="workoutStore.lastSyncDate"
                class="text-[11px] text-slate-400"
              >
                Last synced {{ formatTime(workoutStore.lastSyncDate) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Coach plan modal -->
    <div
      v-if="showCoachPlan"
      class="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        class="absolute inset-0 bg-slate-900/60"
        @click="showCoachPlan = false"
      ></div>

      <div
        class="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div class="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Today’s plan
            </div>
            <div class="text-lg font-black text-slate-900 mt-1">
              {{ recommendationStore.today?.headline || "Coach Plan" }}
            </div>
            <div class="text-xs text-slate-500 mt-1">
              {{ formatRecChip(recommendationStore.today) }}
            </div>
          </div>
          <button
            @click="showCoachPlan = false"
            class="text-sm font-bold text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div class="p-5 space-y-5">
          <div v-if="targetsLine" class="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Targets
            </div>
            <div class="text-sm text-slate-800 mt-2">
              {{ targetsLine }}
            </div>
          </div>

          <div
            v-if="recommendationStore.today?.workout?.steps?.length"
            class="space-y-2"
          >
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Steps
            </div>
            <div class="space-y-2">
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
                <div v-if="s.target" class="text-[11px] text-slate-600 mt-2">
                  <span v-if="s.target.paceMinPerMileLow && s.target.paceMinPerMileHigh">
                    Pace {{ paceMinToString(s.target.paceMinPerMileLow) }}–{{
                      paceMinToString(s.target.paceMinPerMileHigh)
                    }}/mi
                  </span>
                  <span v-if="s.target.hrBpmLow && s.target.hrBpmHigh">
                    <span v-if="s.target.paceMinPerMileLow && s.target.paceMinPerMileHigh">
                      •
                    </span>
                    HR {{ s.target.hrBpmLow }}–{{ s.target.hrBpmHigh }} bpm
                  </span>
                  <span v-if="s.target.rpeLow && s.target.rpeHigh">
                    <span
                      v-if="
                        (s.target.paceMinPerMileLow && s.target.paceMinPerMileHigh) ||
                        (s.target.hrBpmLow && s.target.hrBpmHigh)
                      "
                    >
                      •
                    </span>
                    RPE {{ s.target.rpeLow }}–{{ s.target.rpeHigh }}
                  </span>
                </div>
                <div v-if="s.notes" class="text-xs text-slate-600 mt-2">
                  {{ s.notes }}
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="recommendationStore.today?.rationale?.length"
            class="space-y-2"
          >
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Why this
            </div>
            <ul class="space-y-2">
              <li
                v-for="(r, idx) in recommendationStore.today.rationale"
                :key="idx"
                class="text-sm text-slate-700 flex gap-2"
              >
                <span class="text-slate-400">•</span>
                <span>{{ r }}</span>
              </li>
            </ul>
          </div>

          <div v-if="recommendationStore.today?.fallback" class="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <div class="text-xs font-bold text-amber-700 uppercase tracking-widest">
              Fallback
            </div>
            <div class="text-sm font-semibold text-amber-900 mt-2">
              {{ fallbackLine }}
            </div>
            <div v-if="recommendationStore.today.fallback?.notes" class="text-xs text-amber-900/80 mt-2">
              {{ recommendationStore.today.fallback.notes }}
            </div>
          </div>
        </div>

        <div class="p-5 border-t border-slate-100 flex justify-end gap-2">
          <button
            @click="showCoachPlan = false"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Close
          </button>
          <button
            @click="goToProfile"
            class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
          >
            Edit profile
          </button>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

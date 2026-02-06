<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWorkoutStore } from "../stores/workout";
import MainLayout from "../layouts/MainLayout.vue";

const router = useRouter();
const auth = useAuthStore();
const workoutStore = useWorkoutStore();

// --- HELPERS ---
function goToLogWorkout() {
  router.push("/workouts/new");
}

function goToHistory() {
  router.push("/workouts");
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
          <div class="flex flex-col items-end">
            <button
              @click="handleSyncClick"
              :disabled="workoutStore.isSyncing"
              class="text-xs font-medium transition-colors flex items-center gap-2 px-3 py-2 rounded-lg border"
              :class="
                workoutStore.isConnected
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
              "
            >
              <span v-if="workoutStore.isSyncing" class="animate-spin">↻</span>
              <span
                v-else-if="workoutStore.isConnected"
                class="w-2 h-2 rounded-full bg-emerald-500"
              ></span>

              {{
                workoutStore.isSyncing
                  ? "Syncing..."
                  : workoutStore.isConnected
                    ? "Sync Now"
                    : "Connect Strava"
              }}
            </button>
            <span
              v-if="workoutStore.isConnected && workoutStore.lastSyncDate"
              class="text-[10px] text-slate-400 mt-1 mr-1"
            >
              Synced {{ formatTime(workoutStore.lastSyncDate) }}
            </span>
          </div>

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
              <div class="flex items-center gap-2 mb-4">
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
                    ></path>
                  </svg>
                </div>
                <span
                  class="text-xs font-bold uppercase tracking-widest text-indigo-300"
                >
                  Coach Insight
                </span>
              </div>

              <div class="relative z-10 text-center py-2">
                <div
                  class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-800/50 border border-indigo-700 text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-3"
                >
                  Coming Soon
                </div>
                <h4 class="font-bold text-lg mb-1">AI Coach</h4>
                <p
                  class="font-medium text-indigo-200 text-xs leading-relaxed max-w-[200px] mx-auto"
                >
                  Personalized training insights and race predictions are
                  currently in development.
                </p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 bg-[#FC4C02] rounded-md flex items-center justify-center text-white font-bold text-xs"
                >
                  S
                </div>
                <div>
                  <span
                    class="block text-sm font-medium text-slate-700 leading-none"
                  >
                    Strava
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ workoutStore.isConnected ? "Connected" : "Not Linked" }}
                  </span>
                </div>
              </div>
              <div
                v-if="workoutStore.isConnected"
                class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

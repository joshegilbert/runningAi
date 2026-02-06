<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useWorkoutStore } from "../stores/workout";
import MainLayout from "../layouts/MainLayout.vue";

const route = useRoute();
const router = useRouter();
const workoutStore = useWorkoutStore();

const workout = ref(null);
const loading = ref(true);
const error = ref("");

const id = computed(() => String(route.params.id || ""));

// --- FORMATTERS ---
function meterToMiles(meters) {
  return (Number(meters || 0) / 1609.34).toFixed(2);
}

function formatDuration(seconds) {
  const s = Number(seconds || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatPace(meters, seconds) {
  const m = Number(meters || 0);
  const s = Number(seconds || 0);
  if (!m || !s) return "-:--";
  const miles = m / 1609.34;
  const paceMin = s / 60 / miles;
  const pMin = Math.floor(paceMin);
  const pSec = Math.round((paceMin - pMin) * 60);
  return `${pMin}:${pSec.toString().padStart(2, "0")}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return {
    full: d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
}

onMounted(async () => {
  try {
    workout.value = await workoutStore.fetchWorkoutById(id.value);
  } catch (err) {
    error.value = "Unable to load workout.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <MainLayout>
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Loading -->
      <div v-if="loading" class="py-10">
        <div class="h-10 w-40 bg-slate-100 rounded animate-pulse mb-4"></div>
        <div class="h-40 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="bg-red-50 text-red-700 rounded-xl border border-red-100 p-6"
      >
        {{ error }}
      </div>

      <!-- Content -->
      <div v-else-if="workout" class="space-y-6">
        <!-- Header -->
        <div class="flex items-start justify-between gap-4">
          <div>
            <button
              @click="router.back()"
              class="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 mb-2"
            >
              &larr; Back
            </button>

            <h1 class="text-3xl font-bold text-slate-900 tracking-tight">
              {{ workout.title || "Run" }}
            </h1>

            <p class="text-slate-500 text-sm mt-1">
              {{ formatDate(workout.date).full }}
              <span v-if="formatDate(workout.date).time">
                • {{ formatDate(workout.date).time }}
              </span>
              <span class="ml-2">
                •
                <span class="font-semibold text-slate-600">
                  {{ workout.source?.provider || "manual" }}
                </span>
              </span>
            </p>
          </div>

          <div
            class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border"
            :class="{
              'bg-emerald-50 text-emerald-700 border-emerald-100':
                workout.type === 'easy',
              'bg-purple-50 text-purple-700 border-purple-100':
                workout.type === 'long',
              'bg-amber-50 text-amber-700 border-amber-100':
                workout.type === 'workout',
              'bg-rose-50 text-rose-700 border-rose-100':
                workout.type === 'race',
              'bg-slate-50 text-slate-600 border-slate-200': !workout.type,
            }"
          >
            {{ workout.type || "run" }}
          </div>
        </div>

        <!-- Primary stats -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p
              class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >
              Distance
            </p>
            <div class="mt-2 text-3xl font-black text-slate-900 tabular-nums">
              {{ meterToMiles(workout.distanceMeters) }}
              <span class="text-sm font-semibold text-slate-500">mi</span>
            </div>
          </div>

          <div
            class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p
              class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >
              Pace
            </p>
            <div class="mt-2 text-3xl font-black text-slate-900 tabular-nums">
              {{ formatPace(workout.distanceMeters, workout.durationSeconds) }}
              <span class="text-sm font-semibold text-slate-500">/mi</span>
            </div>
          </div>

          <div
            class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p
              class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >
              Time
            </p>
            <div class="mt-2 text-3xl font-black text-slate-900 tabular-nums">
              {{ formatDuration(workout.durationSeconds) }}
            </div>
          </div>
        </div>

        <!-- Secondary stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p
              class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >
              Avg Heart Rate
            </p>
            <div class="mt-2 text-2xl font-black text-slate-900 tabular-nums">
              {{ workout.avgHeartRateBpm ?? "—" }}
              <span
                v-if="workout.avgHeartRateBpm"
                class="text-sm font-semibold text-slate-500"
              >
                bpm
              </span>
            </div>

            <div
              class="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden"
            >
              <div
                class="h-full bg-rose-500 rounded-full"
                :style="{
                  width: workout.avgHeartRateBpm
                    ? Math.min((workout.avgHeartRateBpm / 200) * 100, 100) + '%'
                    : '0%',
                }"
              ></div>
            </div>
          </div>

          <div
            class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
          >
            <p
              class="text-xs font-bold text-slate-400 uppercase tracking-widest"
            >
              Elevation Gain
            </p>
            <div class="mt-2 text-2xl font-black text-slate-900 tabular-nums">
              {{ workout.elevationGainM ?? "—" }}
              <span
                v-if="workout.elevationGainM != null"
                class="text-sm font-semibold text-slate-500"
              >
                m
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-2">
              {{
                workout.elevationGainM != null ? "Total gain" : "Not available"
              }}
            </p>
          </div>
        </div>

        <!-- Notes -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3
            class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3"
          >
            Notes
          </h3>
          <p
            v-if="workout.notes"
            class="text-slate-700 leading-relaxed whitespace-pre-line"
          >
            {{ workout.notes }}
          </p>
          <p v-else class="text-slate-400 italic text-sm">No notes added.</p>
        </div>

        <!-- Source details (small, not loud) -->
        <div
          v-if="workout.source?.provider === 'strava'"
          class="bg-slate-50 p-4 rounded-2xl border border-slate-200"
        >
          <div
            class="text-xs font-bold text-slate-500 uppercase tracking-widest"
          >
            Strava Details
          </div>
          <div class="text-sm text-slate-700 mt-2 space-y-1">
            <div>
              <span class="text-slate-500">Activity ID:</span>
              {{ workout.source?.activityId }}
            </div>
            <div>
              <span class="text-slate-500">Device:</span>
              {{ workout.source?.deviceName || "—" }}
            </div>
            <div>
              <span class="text-slate-500">Timezone:</span>
              {{ workout.source?.timezone || "—" }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

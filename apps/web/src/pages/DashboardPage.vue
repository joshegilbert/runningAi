<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useWorkoutStore } from "../stores/workout";
import MainLayout from "../layouts/MainLayout.vue";

const router = useRouter();
const auth = useAuthStore();
const workoutStore = useWorkoutStore();

const stravaAuthUrl = `${import.meta.env.VITE_API_BASE_URL}/api/strava/auth`;

function goToLogWorkout() {
  router.push("/workouts/new");
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function meterToMiles(meters) {
  return (meters / 1609.34).toFixed(2);
}

onMounted(() => {
  workoutStore.fetchStatus();
  workoutStore.fetchWorkouts();
});
</script>

<template>
  <MainLayout>
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
    >
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p class="text-slate-500 mt-1">
          Welcome back, {{ auth.user?.name || "Runner" }}
        </p>
      </div>

      <button
        @click="goToLogWorkout"
        class="mt-4 md:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
      >
        <span>+</span>
        Log Run
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 space-y-6">
        <div
          v-if="workoutStore.isLoadingWorkouts"
          class="text-center py-12 text-slate-400"
        >
          Loading your history...
        </div>

        <div
          v-else-if="!workoutStore.hasWorkouts"
          class="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center"
        >
          <p class="text-slate-500 mb-4">No runs logged yet.</p>
          <button
            @click="goToLogWorkout"
            class="text-indigo-600 font-medium hover:underline"
          >
            Log your first run manually &rarr;
          </button>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="workout in workoutStore.workouts"
            :key="workout._id"
            class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group"
          >
            <div class="flex justify-between items-start">
              <div>
                <p
                  class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1"
                >
                  {{ formatDate(workout.date) }}
                </p>
                <h3 class="font-semibold text-slate-900 text-lg">
                  {{ workout.title || "Run" }}
                </h3>

                <div class="flex gap-4 mt-3 text-slate-700">
                  <div>
                    <span class="block text-xs text-slate-400">Distance</span>
                    <span class="font-mono font-medium">
                      {{ meterToMiles(workout.distanceMeters) }} mi
                    </span>
                  </div>
                  <div>
                    <span class="block text-xs text-slate-400">Time</span>
                    <span class="font-mono font-medium">
                      {{ Math.round(workout.durationSeconds / 60) }} min
                    </span>
                  </div>
                </div>
              </div>

              <span
                class="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-medium capitalize"
              >
                {{ workout.type }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 class="font-bold text-slate-900 mb-4 flex items-center gap-2">
            Strava Sync
          </h3>

          <div
            v-if="workoutStore.isSyncing"
            class="text-sm text-indigo-600 font-medium flex items-center gap-2"
          >
            <span class="animate-spin">↻</span>
            Syncing...
          </div>

          <div v-else-if="workoutStore.isConnected">
            <div
              class="flex items-center gap-2 text-emerald-600 text-sm font-medium mb-4"
            >
              <span>●</span>
              Connected
            </div>
            <p
              v-if="workoutStore.lastSyncDate"
              class="text-xs text-slate-400 mb-4"
            >
              Last synced:
              {{ new Date(workoutStore.lastSyncDate).toLocaleTimeString() }}
            </p>
            <button
              @click="workoutStore.syncStrava"
              class="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
            >
              Sync Now
            </button>
          </div>

          <div v-else>
            <p class="text-sm text-slate-500 mb-4">
              Connect your Strava account to automatically import your runs.
            </p>

            <button
              @click="workoutStore.connectToStrava"
              class="w-full text-center py-2 bg-[#FC4C02] hover:bg-[#e34402] text-white text-sm font-bold rounded-lg transition-colors"
            >
              Connect with Strava
            </button>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

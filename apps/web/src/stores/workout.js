import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { createApiClient } from "../services/api";
import { useRecommendationStore } from "./recommendation";

export const useWorkoutStore = defineStore("workout", () => {
  const api = createApiClient(() => localStorage.getItem("token"));

  const workouts = ref([]);
  const stravaStatus = ref(null);

  const isLoadingWorkouts = ref(false);
  const isSyncing = ref(false);
  const error = ref(null);

  const isConnected = computed(() => stravaStatus.value?.connected ?? false);
  const lastSyncDate = computed(() => stravaStatus.value?.lastSyncAt ?? null);
  const hasWorkouts = computed(() => workouts.value.length > 0);

  function clearError() {
    error.value = null;
  }

  function sortWorkoutsNewestFirst(list) {
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function fetchStatus() {
    try {
      const data = await api.get("/strava/status");
      stravaStatus.value = data;
    } catch (err) {
      console.error("Failed to fetch status", err);
      // optional: error.value = "Could not check Strava status.";
    }
  }

  async function syncStrava(options = {}) {
    if (isSyncing.value) return;

    const maxRuns = options.maxRuns;
    const query =
      maxRuns != null && Number.isFinite(Number(maxRuns))
        ? `?maxRuns=${encodeURIComponent(String(maxRuns))}`
        : "";

    isSyncing.value = true;
    clearError();

    try {
      const data = await api.post(`/strava/sync${query}`);

      stravaStatus.value = {
        ...(stravaStatus.value || {}),
        lastSyncAt: data.lastSyncAt,
      };

      await fetchWorkouts();

      try {
        const recStore = useRecommendationStore();
        await recStore.regenerateToday();
      } catch (e) {
        // Don't fail sync if recommendation fails
        console.warn("Recommendation regenerate failed:", e);
      }
    } catch (err) {
      error.value = "Sync failed. Strava might be busy.";
      throw err;
    } finally {
      isSyncing.value = false;
    }
  }

  async function connectToStrava() {
    clearError();

    try {
      const data = await api.get("/strava/connect");
      if (data.url) window.location.href = data.url;
      else error.value = "Could not connect to Strava.";
    } catch (err) {
      console.error("Failed to get Strava URL", err);
      error.value = "Could not connect to Strava.";
    }
  }

  async function fetchWorkouts() {
    isLoadingWorkouts.value = true;
    clearError();

    try {
      const data = await api.get("/workouts");
      const list = data.workouts || [];
      workouts.value = sortWorkoutsNewestFirst(list);
    } catch (err) {
      error.value = "Could not load activities.";
    } finally {
      isLoadingWorkouts.value = false;
    }
  }

  // Next step for Workout Detail Page
  async function fetchWorkoutById(id) {
    clearError();
    try {
      const data = await api.get(`/workouts/${id}`);
      return data.workout;
    } catch (err) {
      error.value = "Could not load that workout.";
      throw err;
    }
  }

  async function createWorkout(payload) {
    clearError();
    try {
      const data = await api.post("/workouts", payload);
      const created = data.workout;
      workouts.value = sortWorkoutsNewestFirst([created, ...workouts.value]);
      return created;
    } catch (err) {
      error.value =
        err?.message || err?.data?.message || "Failed to save workout.";
      throw err;
    }
  }

  return {
    workouts,
    stravaStatus,
    isLoadingWorkouts,
    isSyncing,
    error,

    isConnected,
    lastSyncDate,
    hasWorkouts,

    clearError,
    fetchStatus,
    syncStrava,
    fetchWorkouts,
    connectToStrava,
    fetchWorkoutById,
    createWorkout,
  };
});

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { createApiClient } from "../services/api";

export const useWorkoutStore = defineStore("workout", () => {
  const api = createApiClient(() => localStorage.getItem("token"));

  const workouts = ref([]);

  const stravaStatus = ref(null);

  const isLoadingWorkouts = ref(false);
  const isSyncing = ref(false);
  const error = ref(null);

  const isConnected = computed(() => stravaStatus.value?.connected ?? false);
  const lastSyncDate = computed(() => stravaStatus.value?.lastSyncAt);

  const hasWorkouts = computed(() => workouts.value.length > 0);

  async function fetchStatus() {
    try {
      const data = await api.get("/strava/status");
      stravaStatus.value = data;
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  }

  async function syncStrava() {
    if (isSyncing.value) return;

    isSyncing.value = true;
    error.value = null;

    try {
      const data = await api.post("/strava/sync");

      stravaStatus.value = {
        ...stravaStatus.value,
        lastSyncAt: data.lastSyncAt,
      };
      await fetchWorkouts();
    } catch (err) {
      error.value = "Sync failed. Strava might be busy.";
      throw err;
    } finally {
      isSyncing.value = false;
    }
  }

  async function connectToStrava() {
    try {
      // 1. Ask backend for the unique Strava URL
      const data = await api.get("/strava/connect");

      // 2. Redirect the browser manually
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to get Strava URL", err);
      error.value = "Could not connect to Strava.";
    }
  }

  async function fetchWorkouts() {
    isLoadingWorkouts.value = true;

    try {
      const data = await api.get("/workouts");
      workouts.value = data.workouts || [];
    } catch (err) {
      error.value = "Could not load activities.";
    } finally {
      isLoadingWorkouts.value = false;
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

    fetchStatus,
    syncStrava,
    fetchWorkouts,
    connectToStrava,
  };
});

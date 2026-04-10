import { defineStore } from "pinia";
import { ref } from "vue";
import { createApiClient } from "../services/api";

export const useRecommendationStore = defineStore("recommendation", () => {
  const api = createApiClient(() => localStorage.getItem("token"));

  const today = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

  function clearError() {
    error.value = null;
  }

  async function fetchToday() {
    if (isLoading.value) return;
    isLoading.value = true;
    clearError();

    try {
      today.value = await api.get("/recommendations/today");
      return today.value;
    } catch (err) {
      error.value = err?.message || "Could not load today’s recommendation.";
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // ✅ NEW
  async function regenerateToday() {
    if (isLoading.value) return;
    isLoading.value = true;
    clearError();

    try {
      today.value = await api.post("/recommendations/today/regenerate");
      return today.value;
    } catch (err) {
      error.value = err?.message || "Could not regenerate recommendation.";
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    today,
    isLoading,
    error,
    fetchToday,
    regenerateToday, // ✅ export it
    clearError,
  };
});

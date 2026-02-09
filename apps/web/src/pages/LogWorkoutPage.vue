<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useWorkoutStore } from "../stores/workout";
import MainLayout from "../layouts/MainLayout.vue";

const router = useRouter();
const workoutStore = useWorkoutStore();

// Form State
const date = ref(new Date().toISOString().split("T")[0]); // Today's date YYYY-MM-DD
const type = ref("easy");
const distanceMiles = ref("");
const durationMinutes = ref("");
const notes = ref("");
const loading = ref(false);
const error = ref("");

// Helpers
function milesToMeters(miles) {
  const n = parseFloat(miles);
  return Number.isFinite(n) ? Math.round(n * 1609.34) : 0;
}

function minutesToSeconds(minutes) {
  const n = parseFloat(minutes);
  return Number.isFinite(n) ? Math.round(n * 60) : 0;
}

async function handleSubmit() {
  loading.value = true;
  error.value = "";

  try {
    const payload = {
      date: date.value,
      type: type.value,
      title: `${type.value.charAt(0).toUpperCase() + type.value.slice(1)} Run`, // e.g. "Easy Run"
      distanceMeters: milesToMeters(distanceMiles.value),
      durationSeconds: minutesToSeconds(durationMinutes.value),
      notes: notes.value,
      sportType: "Run",
    };

    await workoutStore.createWorkout(payload);
    router.push("/dashboard");
  } catch (err) {
    error.value = err?.message || "Failed to save workout. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <MainLayout>
    <div class="max-w-2xl mx-auto">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <button
            @click="router.back()"
            class="text-sm text-slate-500 hover:text-indigo-600 mb-2"
          >
            &larr; Back to Dashboard
          </button>
          <h1 class="text-3xl font-bold text-slate-900">Log a Run</h1>
        </div>
      </div>

      <div
        class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8"
      >
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                v-model="date"
                required
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Run Type
              </label>
              <select
                v-model="type"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="easy">Easy Run</option>
                <option value="long">Long Run</option>
                <option value="workout">Workout / Intervals</option>
                <option value="race">Race</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Distance (miles)
              </label>
              <input
                type="number"
                step="0.01"
                v-model="distanceMiles"
                required
                placeholder="0.00"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                step="1"
                v-model="durationMinutes"
                required
                placeholder="0"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              v-model="notes"
              rows="3"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="How did it feel?"
            ></textarea>
          </div>

          <div
            v-if="error"
            class="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100"
          >
            {{ error }}
          </div>

          <div class="flex justify-end gap-4 pt-4">
            <button
              type="button"
              @click="router.back()"
              class="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center"
            >
              <span v-if="loading" class="animate-spin mr-2">↻</span>
              {{ loading ? "Saving..." : "Save Workout" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </MainLayout>
</template>

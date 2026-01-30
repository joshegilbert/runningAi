<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import MainLayout from "../layouts/MainLayout.vue";
import { useWorkoutStore } from "../stores/workout";

const route = useRoute();
const router = useRouter();
const workoutStore = useWorkoutStore();

// UI States
const isVerifying = ref(true);
const verificationError = ref("");
const isLongSync = ref(false); // Used to show "Still working..." message

// 1. Determine the "Intent" from the URL
const urlStatus = computed(() => String(route.query.status || ""));

// 2. Computed "Final" State (Only true if URL + Backend agree)
const isVerifiedSuccess = computed(
  () =>
    urlStatus.value === "success" &&
    workoutStore.isConnected &&
    !verificationError.value,
);

function goToDashboard() {
  router.push("/dashboard");
}

async function handleSyncAndRedirect() {
  try {
    // Start the visual loading state
    // We don't need a local loading ref because we use store.isSyncing

    // Set a timeout to show a "Taking longer than usual" message after 3s
    const slowTimer = setTimeout(() => {
      isLongSync.value = true;
    }, 3000);

    await workoutStore.syncStrava();

    clearTimeout(slowTimer);
    router.push("/dashboard");
  } catch (err) {
    // If sync fails, stay here and show error
    verificationError.value =
      "Sync failed to start. Try again or go to dashboard.";
  }
}

onMounted(async () => {
  try {
    // 1. Verify backend truth
    await workoutStore.fetchStatus();

    // 2. Safety Check: URL says success, but Backend says disconnected?
    if (urlStatus.value === "success" && !workoutStore.isConnected) {
      throw new Error(
        "Strava reported success, but connection could not be verified.",
      );
    }
  } catch (err) {
    verificationError.value = err.message || "Connection verification failed.";
  } finally {
    isVerifying.value = false;
  }
});
</script>

<template>
  <MainLayout>
    <div class="min-h-[60vh] flex items-center justify-center p-4">
      <div
        class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div v-if="isVerifying" class="p-12 text-center">
          <div
            class="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"
          ></div>
          <h2 class="text-lg font-semibold text-slate-900">
            Verifying Connection...
          </h2>
          <p class="text-slate-500 text-sm mt-1">
            Confirming security tokens with Strava
          </p>
        </div>

        <div v-else-if="isVerifiedSuccess" class="text-center">
          <div class="bg-emerald-50 p-8 border-b border-emerald-100">
            <div
              class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-900">
              Connection Successful!
            </h1>
            <p class="text-emerald-800 font-medium mt-2">
              Your Strava account is linked.
            </p>
          </div>

          <div class="p-8 bg-white">
            <p class="text-slate-600 mb-8">
              We are ready to import your run history. This creates your
              baseline analytics.
            </p>

            <div class="space-y-3">
              <button
                @click="handleSyncAndRedirect"
                :disabled="workoutStore.isSyncing"
                class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
              >
                <span v-if="workoutStore.isSyncing" class="animate-spin">
                  ↻
                </span>
                {{
                  workoutStore.isSyncing
                    ? "Importing History..."
                    : "Sync Now & Go to Dashboard"
                }}
              </button>

              <button
                @click="goToDashboard"
                :disabled="workoutStore.isSyncing"
                class="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-600 font-semibold rounded-xl transition-colors"
              >
                Skip for now
              </button>
            </div>

            <p
              v-if="isLongSync"
              class="text-xs text-slate-400 mt-4 animate-pulse"
            >
              This might take a moment if you have many runs...
            </p>
          </div>
        </div>

        <div v-else class="text-center">
          <div class="bg-red-50 p-8 border-b border-red-100">
            <div
              class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-900">Connection Failed</h1>
            <p class="text-red-800 font-medium mt-2">
              {{ verificationError || "We couldn't verify your account." }}
            </p>
          </div>

          <div class="p-8 bg-white">
            <p class="text-slate-600 mb-6">
              Don't worry, no data was lost. Please try connecting again from
              the dashboard.
            </p>
            <button
              @click="goToDashboard"
              class="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

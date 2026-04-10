<script setup>
import { computed, onMounted, ref, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import MainLayout from "../layouts/MainLayout.vue";
import { useWorkoutStore } from "../stores/workout";

const route = useRoute();
const router = useRouter();
const workoutStore = useWorkoutStore();

// --- STATE ---
const isVerifying = ref(true);
const verificationError = ref("");

// Sync feedback
const syncMessage = ref("Importing History...");
let messageInterval = null;

// --- COMPUTED HELPERS ---
const urlStatus = computed(() => String(route.query.status || ""));
const urlReason = computed(() => String(route.query.reason || ""));

// Backend reason → friendly UI copy
const errorDetails = computed(() => {
  const map = {
    missing_params: {
      title: "Incomplete Request",
      msg: "The connection was canceled or incomplete.",
    },
    invalid_state: {
      title: "Security Alert",
      msg: "Security verification failed. Please connect again.",
    },
    state_used: {
      title: "Link Already Used",
      msg: "This connection link has already been used.",
    },
    state_expired: {
      title: "Link Expired",
      msg: "This connection link expired. Please try again.",
    },
    token_exchange_failed: {
      title: "Connection Denied",
      msg: "Strava did not approve the connection.",
    },
    server_error: {
      title: "Server Error",
      msg: "Something went wrong on our side. Please try again.",
    },
  };

  return (
    map[urlReason.value] || {
      title: "Connection Failed",
      msg: verificationError.value || "We couldn't verify your account.",
    }
  );
});

const isVerifiedSuccess = computed(
  () =>
    urlStatus.value === "success" &&
    workoutStore.isConnected &&
    !verificationError.value,
);

// --- ACTIONS ---
function goToDashboard() {
  router.push("/dashboard");
}

// Rotating sync messages (keeps trust high)
function startLoadingMessages() {
  if (messageInterval) clearInterval(messageInterval);

  const messages = [
    "Contacting Strava...",
    "Downloading activities...",
    "Processing data...",
    "Almost there...",
  ];

  let i = 0;
  syncMessage.value = messages[0];

  messageInterval = setInterval(() => {
    i = (i + 1) % messages.length;
    syncMessage.value = messages[i];
  }, 2000);
}

async function handleSyncAndRedirect() {
  verificationError.value = "";
  startLoadingMessages();

  try {
    await workoutStore.syncStrava({ maxRuns: 15 });
    router.push("/dashboard");
  } catch (err) {
    verificationError.value =
      err?.message || "Sync failed to start. Try again.";
  } finally {
    if (messageInterval) {
      clearInterval(messageInterval);
      messageInterval = null;
    }
  }
}

// Cleanup interval if user leaves early
onUnmounted(() => {
  if (messageInterval) clearInterval(messageInterval);
});

onMounted(async () => {
  try {
    await workoutStore.fetchStatus();

    if (urlStatus.value === "success" && !workoutStore.isConnected) {
      throw new Error(
        "Strava reported success, but connection could not be verified.",
      );
    }
  } catch (err) {
    verificationError.value = err?.message || "Connection verification failed.";
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
        <!-- Verifying -->
        <div v-if="isVerifying" class="p-12 text-center">
          <div
            class="animate-spin w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-full mx-auto mb-6"
          ></div>
          <h2 class="text-lg font-bold text-slate-900">
            Verifying Connection…
          </h2>
          <p class="text-slate-500 text-sm mt-2">
            Confirming connection status
          </p>
        </div>

        <!-- Success -->
        <div v-else-if="isVerifiedSuccess" class="text-center">
          <div class="bg-emerald-50 p-8 border-b border-emerald-100">
            <div
              class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              ✓
            </div>
            <h1 class="text-2xl font-bold text-slate-900">
              Connection Successful
            </h1>
            <p class="text-emerald-700 font-medium mt-2">
              Your Strava account is linked.
            </p>
          </div>

          <div class="p-8">
            <p class="text-slate-600 mb-8">
              We’re ready to import your run history and build your baseline.
            </p>

            <button
              @click="handleSyncAndRedirect"
              :disabled="workoutStore.isSyncing"
              class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold mb-3"
            >
              <span v-if="workoutStore.isSyncing">↻ {{ syncMessage }}</span>
              <span v-else>Sync History & Continue</span>
            </button>

            <button
              @click="goToDashboard"
              :disabled="workoutStore.isSyncing"
              class="w-full py-3 px-4 text-slate-600 font-semibold"
            >
              Skip for now
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-else class="text-center">
          <div class="bg-red-50 p-8 border-b border-red-100">
            <h1 class="text-2xl font-bold text-slate-900">
              {{ errorDetails.title }}
            </h1>
            <p class="text-red-700 font-medium mt-2">
              {{ errorDetails.msg }}
            </p>
          </div>

          <div class="p-8">
            <p class="text-slate-600 mb-6">
              No data was lost. You can safely try again.
            </p>
            <button
              @click="goToDashboard"
              class="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useWorkoutStore } from "../stores/workout";
import MainLayout from "../layouts/MainLayout.vue";

const router = useRouter();
const workoutStore = useWorkoutStore();

// --- STATE ---
const searchQuery = ref("");
const activeFilter = ref("all");

// pagination / "show more"
const PAGE_SIZE = 12;
const visibleCount = ref(PAGE_SIZE);

// --- HELPERS ---
function goToDashboard() {
  router.push("/dashboard");
}

function goToLogWorkout() {
  router.push("/workouts/new");
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

function getDayName(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
}

function openWorkout(runId) {
  router.push(`/workouts/${runId}`);
}

function clearFilters() {
  searchQuery.value = "";
  activeFilter.value = "all";
}

// --- FILTER LOGIC ---
const filteredWorkouts = computed(() => {
  let runs = workoutStore.workouts;

  if (activeFilter.value !== "all") {
    runs = runs.filter((w) => w.type === activeFilter.value);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    runs = runs.filter(
      (w) =>
        (w.title && w.title.toLowerCase().includes(q)) ||
        (w.notes && w.notes.toLowerCase().includes(q)),
    );
  }

  return runs;
});

// show only a subset (progressive reveal)
const visibleWorkouts = computed(() => {
  return filteredWorkouts.value.slice(0, visibleCount.value);
});

const canShowMore = computed(() => {
  return visibleCount.value < filteredWorkouts.value.length;
});

function showMore() {
  visibleCount.value = Math.min(
    visibleCount.value + PAGE_SIZE,
    filteredWorkouts.value.length,
  );
}

function showAll() {
  visibleCount.value = filteredWorkouts.value.length;
}

// Reset pagination when filters/search change (better UX)
watch([searchQuery, activeFilter], () => {
  visibleCount.value = PAGE_SIZE;
});

// --- FILTER BUTTONS ---
const filters = [
  { id: "all", label: "All Runs" },
  { id: "easy", label: "Easy" },
  { id: "long", label: "Long Run" },
  { id: "workout", label: "Workouts" },
  { id: "race", label: "Races" },
];

onMounted(() => {
  if (!workoutStore.hasWorkouts) {
    workoutStore.fetchWorkouts();
  }
});
</script>

<template>
  <MainLayout>
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Top header with back nav -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <button
            @click="goToDashboard"
            class="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600"
          >
            &larr; Back to Dashboard
          </button>

          <h1 class="text-2xl font-bold text-slate-900 mt-2">Activity Log</h1>

          <p class="text-slate-500 text-sm mt-1">
            {{ workoutStore.workouts.length }} activities recorded
            <span
              v-if="filteredWorkouts.length !== workoutStore.workouts.length"
            >
              • {{ filteredWorkouts.length }} matching
            </span>
          </p>
        </div>

        <button
          @click="goToLogWorkout"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
        >
          + Log Run
        </button>
      </div>

      <!-- Filters/Search card -->
      <div
        class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by title or notes..."
            class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            v-for="filter in filters"
            :key="filter.id"
            @click="activeFilter = filter.id"
            class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border"
            :class="
              activeFilter === filter.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            "
          >
            {{ filter.label }}
          </button>

          <button
            v-if="searchQuery || activeFilter !== 'all'"
            @click="clearFilters"
            class="px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border bg-white text-indigo-600 border-indigo-200 hover:border-indigo-300"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="space-y-4">
        <div v-if="workoutStore.isLoadingWorkouts" class="space-y-4">
          <div
            v-for="i in 5"
            :key="i"
            class="h-24 bg-white rounded-xl border border-slate-200 animate-pulse"
          ></div>
        </div>

        <div v-else-if="!workoutStore.hasWorkouts" class="text-center py-12">
          <div
            class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
          >
            📭
          </div>
          <h3 class="font-bold text-slate-900">No history found</h3>
          <p class="text-slate-500 text-sm mb-4">
            Start logging your training to see it here.
          </p>
          <button
            @click="goToLogWorkout"
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            + Log your first run
          </button>
        </div>

        <div
          v-else-if="filteredWorkouts.length === 0"
          class="text-center py-12"
        >
          <p class="text-slate-500">No runs match your filters.</p>
          <button
            @click="clearFilters"
            class="text-indigo-600 text-sm font-bold mt-2 hover:underline"
          >
            Clear Filters
          </button>
        </div>

        <div v-else class="space-y-3">
          <!-- Count row -->
          <div
            class="flex items-center justify-between text-xs text-slate-500 px-1"
          >
            <div>
              Showing
              <span class="font-semibold">{{ visibleWorkouts.length }}</span>
              of
              <span class="font-semibold">{{ filteredWorkouts.length }}</span>
            </div>

            <button
              v-if="canShowMore"
              @click="showAll"
              class="font-bold text-indigo-600 hover:underline"
            >
              Show all
            </button>
          </div>

          <!-- Items -->
          <div
            v-for="run in visibleWorkouts"
            :key="run._id"
            class="group bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
            @click="openWorkout(run._id)"
          >
            <div class="flex items-start justify-between">
              <div class="flex gap-4">
                <div class="flex-shrink-0 w-12 text-center">
                  <div
                    class="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >
                    {{ getDayName(run.date) }}
                  </div>
                  <div class="text-xl font-bold text-slate-900 leading-none">
                    {{ new Date(run.date).getDate() }}
                  </div>
                  <div class="text-[10px] font-medium text-slate-400 mt-1">
                    {{
                      new Date(run.date).toLocaleDateString("en-US", {
                        month: "short",
                      })
                    }}
                  </div>
                </div>

                <div>
                  <h3
                    class="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors"
                  >
                    {{ run.title || "Run" }}
                  </h3>

                  <div class="flex items-center gap-2 mt-1.5">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border"
                      :class="{
                        'bg-emerald-50 text-emerald-700 border-emerald-100':
                          run.type === 'easy',
                        'bg-purple-50 text-purple-700 border-purple-100':
                          run.type === 'long',
                        'bg-amber-50 text-amber-700 border-amber-100':
                          run.type === 'workout',
                        'bg-rose-50 text-rose-700 border-rose-100':
                          run.type === 'race',
                      }"
                    >
                      {{ run.type }}
                    </span>

                    <span
                      v-if="run.source?.provider === 'strava'"
                      class="flex items-center gap-1 text-[10px] text-slate-400 font-medium"
                    >
                      <svg
                        class="w-3 h-3 text-[#FC4C02]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"
                        />
                      </svg>
                      Strava
                    </span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="font-mono font-bold text-slate-900 text-lg">
                  {{ meterToMiles(run.distanceMeters) }}
                  <span class="text-xs text-slate-400 font-sans">mi</span>
                </div>
                <div class="font-mono text-sm text-slate-500 mt-1">
                  {{ formatPace(run.distanceMeters, run.durationSeconds) }}
                  <span class="text-[10px] text-slate-400 font-sans">/mi</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Show more button -->
          <div v-if="canShowMore" class="pt-2">
            <button
              @click="showMore"
              class="w-full bg-white border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
            >
              Show
              {{
                Math.min(PAGE_SIZE, filteredWorkouts.length - visibleCount)
              }}
              more
            </button>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

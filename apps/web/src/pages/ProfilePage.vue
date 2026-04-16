<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import MainLayout from "../layouts/MainLayout.vue";
import { useAuthStore } from "../stores/auth";
import { createApiClient } from "../services/api";

const router = useRouter();
const auth = useAuthStore();
const api = createApiClient(() => auth.token);

const loading = ref(true);
const saving = ref(false);
const error = ref("");
const success = ref("");

const profile = ref({
  experienceLevel: "beginner",
  timezone: "",
  goalRace: {
    name: "",
    dateISO: "",
    distanceLabel: "",
    targetTimeMinutes: null,
  },
  availability: {
    daysPerWeek: null,
    timePerDayMinutes: null,
    preferredLongRunDay: null,
    constraints: "",
  },
  zones: {
    easy: {
      paceMinPerMileLow: null,
      paceMinPerMileHigh: null,
      hrBpmLow: null,
      hrBpmHigh: null,
    },
    tempo: {
      paceMinPerMileLow: null,
      paceMinPerMileHigh: null,
      hrBpmLow: null,
      hrBpmHigh: null,
    },
  },
});

function coerceNumberOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalize() {
  const p = profile.value;
  p.availability.daysPerWeek = coerceNumberOrNull(p.availability.daysPerWeek);
  p.availability.timePerDayMinutes = coerceNumberOrNull(
    p.availability.timePerDayMinutes
  );

  for (const k of ["easy", "tempo"]) {
    p.zones[k].paceMinPerMileLow = coerceNumberOrNull(p.zones[k].paceMinPerMileLow);
    p.zones[k].paceMinPerMileHigh = coerceNumberOrNull(
      p.zones[k].paceMinPerMileHigh
    );
    p.zones[k].hrBpmLow = coerceNumberOrNull(p.zones[k].hrBpmLow);
    p.zones[k].hrBpmHigh = coerceNumberOrNull(p.zones[k].hrBpmHigh);
  }

  p.goalRace = p.goalRace || {};
  p.goalRace.targetTimeMinutes = coerceNumberOrNull(
    p.goalRace.targetTimeMinutes
  );
}

async function load() {
  loading.value = true;
  error.value = "";
  success.value = "";
  try {
    const me = await api.get("/api/me");
    const tp = me?.user?.trainingProfile || {};

    profile.value = {
      ...profile.value,
      ...tp,
      goalRace: {
        ...profile.value.goalRace,
        ...(tp.goalRace || {}),
      },
      availability: { ...profile.value.availability, ...(tp.availability || {}) },
      zones: {
        ...profile.value.zones,
        ...(tp.zones || {}),
        easy: { ...profile.value.zones.easy, ...(tp.zones?.easy || {}) },
        tempo: { ...profile.value.zones.tempo, ...(tp.zones?.tempo || {}) },
      },
    };
  } catch (e) {
    error.value = e?.message || "Failed to load profile.";
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  success.value = "";
  try {
    normalize();
    const res = await api.patch("/api/me", { trainingProfile: profile.value });
    // Keep auth store user in sync (so the rest of the app reflects profile)
    auth.user = res?.user || auth.user;
    success.value = "Saved.";
  } catch (e) {
    error.value = e?.message || "Failed to save profile.";
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <MainLayout>
    <div class="max-w-3xl mx-auto space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <button
            @click="router.back()"
            class="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 mb-2"
          >
            &larr; Back
          </button>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight">
            Training Profile
          </h1>
          <p class="text-slate-500 text-sm mt-1">
            Set your availability and zones so today’s recommendation is more
            specific.
          </p>
        </div>

        <button
          @click="save"
          :disabled="saving || loading"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {{ saving ? "Saving..." : "Save" }}
        </button>
      </div>

      <div v-if="loading" class="space-y-3">
        <div class="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
        <div class="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>

      <div
        v-else
        class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6"
      >
        <div v-if="error" class="bg-red-50 text-red-700 rounded-xl border border-red-100 p-4">
          {{ error }}
        </div>
        <div v-if="success" class="bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 p-4">
          {{ success }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              Experience level
            </label>
            <select
              v-model="profile.experienceLevel"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">
              Timezone (IANA)
            </label>
            <input
              v-model="profile.timezone"
              placeholder="America/Los_Angeles"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p class="text-[11px] text-slate-400 mt-1">
              Used to generate the recommendation for your local “today”.
            </p>
          </div>
        </div>

        <div class="border-t border-slate-100 pt-6 space-y-4">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Race goal (optional)</h3>
            <p class="text-xs text-slate-500 mt-1">
              Used to align weekly volume and workout emphasis toward your event.
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Race name
              </label>
              <input
                v-model="profile.goalRace.name"
                placeholder="e.g. Chicago Half Marathon"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Race date
              </label>
              <input
                v-model="profile.goalRace.dateISO"
                type="date"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Distance
              </label>
              <input
                v-model="profile.goalRace.distanceLabel"
                placeholder="Half marathon, 10K, …"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Target finish time (minutes)
              </label>
              <input
                v-model="profile.goalRace.targetTimeMinutes"
                type="number"
                min="10"
                max="600"
                placeholder="e.g. 120 for 2:00:00"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p class="text-[11px] text-slate-400 mt-1">
                Total minutes (e.g. 95 for 1:35:00).
              </p>
            </div>
          </div>
        </div>

        <div class="border-t border-slate-100 pt-6">
          <h3 class="text-sm font-bold text-slate-900">Availability</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Days/week
              </label>
              <input
                v-model="profile.availability.daysPerWeek"
                type="number"
                min="1"
                max="7"
                placeholder="5"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Time/day (min)
              </label>
              <input
                v-model="profile.availability.timePerDayMinutes"
                type="number"
                min="10"
                max="240"
                placeholder="60"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                Long run day
              </label>
              <select
                v-model="profile.availability.preferredLongRunDay"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option :value="null">—</option>
                <option value="mon">Mon</option>
                <option value="tue">Tue</option>
                <option value="wed">Wed</option>
                <option value="thu">Thu</option>
                <option value="fri">Fri</option>
                <option value="sat">Sat</option>
                <option value="sun">Sun</option>
              </select>
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-sm font-medium text-slate-700 mb-1">
              Constraints (optional)
            </label>
            <textarea
              v-model="profile.availability.constraints"
              rows="2"
              placeholder="e.g. no hills, treadmill only, sore calf…"
              class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            ></textarea>
          </div>
        </div>

        <div class="border-t border-slate-100 pt-6 space-y-5">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Zones (Easy)</h3>
            <p class="text-xs text-slate-500 mt-1">
              Pace in minutes per mile (decimal). Slower end = higher number
              (e.g. 10.5); faster end = lower number (e.g. 9.0). Leave blank if
              unknown.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
              <input
                v-model="profile.zones.easy.paceMinPerMileLow"
                placeholder="Slower end (min/mi)"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                v-model="profile.zones.easy.paceMinPerMileHigh"
                placeholder="Faster end (min/mi)"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                v-model="profile.zones.easy.hrBpmLow"
                placeholder="HR low"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                v-model="profile.zones.easy.hrBpmHigh"
                placeholder="HR high"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <h3 class="text-sm font-bold text-slate-900">Zones (Tempo)</h3>
            <p class="text-xs text-slate-500 mt-1">
              Same pace convention: slower = higher min/mi, faster = lower min/mi.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
              <input
                v-model="profile.zones.tempo.paceMinPerMileLow"
                placeholder="Slower end (min/mi)"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                v-model="profile.zones.tempo.paceMinPerMileHigh"
                placeholder="Faster end (min/mi)"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                v-model="profile.zones.tempo.hrBpmLow"
                placeholder="HR low"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                v-model="profile.zones.tempo.hrBpmHigh"
                placeholder="HR high"
                class="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>
</template>


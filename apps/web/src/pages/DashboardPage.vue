<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { ref, onMounted } from "vue";
import { createApiClient } from "../services/api.js";

const router = useRouter();
const auth = useAuthStore();
const api = createApiClient(() => localStorage.getItem("token"));
const workouts = ref([]); 
const loadingWorkouts = ref(false);
const workoutsError = ref("");

async function fetchWorkouts() {
  loadingWorkouts.value = true;
  workoutsError.value = "";

  try{
    const data = await api.get("/workouts");
    workouts.value = data.workouts || [];
  } catch (err) {
    workoutsError.value = err?.message || "Failed to load workouts";
  } finally {
    loadingWorkouts.value = false;
  }
}

function handleLogout() {
  auth.logout();
  router.replace("/login");
}

function goToLogWorkout() {
  router.push("/workouts/new")
}

function meterToMiles(meters) {
  return (meters /1609.34).toFixed(2)
}

function secondsToMinutes(seconds) {
  return Math.round(seconds / 60)
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString();
}

onMounted(() => 
{
  fetchWorkouts();
});
</script>

<template>
  <div style="max-width: 700px; margin: 2rem auto">
    <div
      style="display: flex; justify-content: space-between; align-items: center"
    >
      <h1>Dashboard</h1>
      <div style="display: flex; gap:0.5rem; align-items: center">
        <button @click="goToLogWorkout">Log a run</button>
        <button @click="handleLogout">Logout</button>
      </div>
    </div>
  </div>

  <p v-if="auth.user">Welcome, {{ auth.user.name || auth.user.email }}!</p>
  <p v-else>Loading user...</p>

  <section>
    <h2>Recent Workouts</h2>
    <p v-if="loadingWorkouts">Loading workouts</p>
    <p v-else-if="workoutsError">{{ workoutsError }}</p>
    <p v-else-if="workouts.length === 0">No workouts yet. Log your first Run!</p>

    <ul v-else>
      <li v-for="w in workouts" :key="w._id">
        <strong>{{ formatDate(w.date) }}</strong>
        - {{ w.type }}
        - {{ meterToMiles(w.distanceMeters) }} mi
        - {{ secondsToMinutes(w.durationSeconds) }} min 
        <span v-if="w.notes"> - {{ w.notes }}</span>
      </li>
    </ul>
  </section>
</template>

<template>
    <div class="page">
        <h1>Log a Run</h1>
        <form @submit.prevent="submit">
            <label>
                Date
                <input type="date" v-model="date" required />
            </label>
            <label>
                type
                <select v-model="type" required>
                    <option value="easy">Easy</option>
                    <option value="workout">Workout</option>
                    <option value="long">Long</option>
                    <option value="race">Race</option>
                </select>
            </label>
            <label>
                Distance (miles)
                <input type="number" v-model.number="distanceMiles" min="0" step=".01" required />
            </label>
            <label>
                Duration (minutes)
                <input type="number" v-model.number="durationMinutes" min="0" step="1" required />
            </label>
            <label>
                Notes
                <textarea v-model="notes" rows="4"></textarea>
            </label>
            <button type="submit">
                Save Workout
            </button>
        </form>
    </div>
</template>

<script setup>
    import {ref} from "vue";
    import { createApiClient } from "../services/api.js";
    import { useRouter } from "vue-router";
    
    const router = useRouter();
    const api = createApiClient(() => localStorage.getItem("token"));


    const date = ref("");
    const type = ref("easy");
    const distanceMiles = ref(0);
    const durationMinutes = ref(0);
    const notes = ref("");

    const loading = ref(false);
    const error = ref("");

    function milesToMeters(miles) {
        return Math.round(miles * 1609.34)
    }

    function minutesToSeconds(minutes) {
        return Math.round(minutes * 60)
    }

    async function submit() {
        loading.value = true;
        error.value = "";

        try {
            await api.post("/workouts",
                {
                    date: date.value,
                    type: type.value,
                    distanceMeters: milesToMeters(distanceMiles.value),
                    durationSeconds: minutesToSeconds(durationMinutes.value),
                    notes: notes.value
                }
            );
            router.push("/dashboard?refresh=1");
        } catch (err){
            error.value = "Failed to save workout";
        } finally {
            loading.value = false;
        }
    
    }
</script>
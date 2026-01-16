<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

function handleLogout() {
  auth.logout();
  router.replace("/login");
}
</script>

<template>
  <div style="max-width: 700px; margin: 2rem auto">
    <div
      style="display: flex; justify-content: space-between; align-items: center"
    >
      <h1>Dashboard</h1>
      <button @click="handleLogout">Logout</button>
    </div>
  </div>

  <p v-if="auth.user">Welcome, {{ auth.user.name || auth.user.email }}!</p>
  <p v-else>Loading user...</p>
</template>

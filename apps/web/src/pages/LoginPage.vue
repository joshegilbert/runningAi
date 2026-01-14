<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();
const auth = useAuthStore();

async function handleLogin() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push("/dashboard");
  } catch (err) {
    error.value = err?.message || "Login failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width: 400px; margin: 2rem auto">
    <h1>Login</h1>
    <form @submit.prevent="handleLogin">
      <div>
        <label>Email</label>
        <br />
        <input type="email" v-model="email" required />
      </div>
      <div style="margin-top: 1rem">
        <label>Password</label>
        <br />
        <input type="password" v-model="password" required />
      </div>
      <p v-if="error" style="color: red; margin-top: 1rem">
        {{ error }}
      </p>
      <button type="submit" :disabled="loading" style="margin-top: 1rem">
        {{ loading ? "Logging in..." : "Login" }}
      </button>
    </form>
  </div>
</template>

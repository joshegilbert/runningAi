<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();
const email = ref("");
const password = ref("");
const name = ref("");
const error = ref("");
const loading = ref(false);

async function handleRegister() {
  error.value = "";
  loading.value = true;
  try {
    await auth.register(name.value, email.value, password.value);
    router.push("/dashboard");
  } catch (err) {
    error.value = err?.message || "Registration failed";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width: 400px; margin: 2rem auto">
    <h1>Registration</h1>
    <form @submit.prevent="handleRegister">
      <div>
        <label>Name (optional)</label>
        <br />
        <input v-model="name" />
      </div>
      <div style="margin-top: 1rem">
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
        {{ loading ? "Creating account..." : "Create account" }}
      </button>
      <p style="margin-top: 1rem; text-align: center">
        Already have and account?
        <router-link to="/Login">Login</router-link>
      </p>
    </form>
  </div>
</template>

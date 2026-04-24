<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleLogin() {
  error.value = "";
  loading.value = true;

  try {
    await auth.login(email.value, password.value);
    router.push("/dashboard");
  } catch (err) {
    error.value = err?.message || "Invalid email or password.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
    <router-link
      to="/"
      class="self-start sm:self-center max-w-md w-full mb-4 text-sm text-indigo-600 font-medium hover:underline"
    >
      ← RunSync home
    </router-link>
    <div
      class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100"
    >
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-slate-900">Welcome Back</h1>
        <p class="text-slate-500 mt-2 text-sm">
          Sign in to RunSync to open your training center
        </p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            v-model="email"
            required
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>
          <input
            type="password"
            v-model="password"
            required
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <div
          v-if="error"
          class="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100"
        >
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
        >
          <span v-if="loading" class="animate-spin mr-2">↻</span>
          {{ loading ? "Signing in..." : "Sign In" }}
        </button>
      </form>

      <p class="text-center mt-6 text-sm text-slate-500">
        Don't have an account?
        <router-link
          to="/register"
          class="text-indigo-600 font-semibold hover:underline"
        >
          Create one
        </router-link>
      </p>
    </div>
  </div>
</template>

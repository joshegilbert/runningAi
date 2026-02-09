<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleRegister() {
  error.value = "";
  loading.value = true;

  try {
    await auth.register(name.value, email.value, password.value);
    router.push("/dashboard");
  } catch (err) {
    error.value = err?.message || "Registration failed. Try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div
      class="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100"
    >
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-slate-900">Create Account</h1>
        <p class="text-slate-500 mt-2 text-sm">Join RunSync today</p>
      </div>

      <form @submit.prevent="handleRegister" class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            v-model="name"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="John Doe"
          />
        </div>

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
            placeholder="Min. 8 characters"
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
          {{ loading ? "Creating..." : "Create Account" }}
        </button>
      </form>

      <p class="text-center mt-6 text-sm text-slate-500">
        Already have an account?
        <router-link
          to="/login"
          class="text-indigo-600 font-semibold hover:underline"
        >
          Sign In
        </router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "../stores/auth";
import { useRouter, useRoute } from "vue-router";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

function handleLogout() {
  auth.logout();
  router.push("/login");
}

function isActive(path) {
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 font-sans">
    <!-- Top Nav -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div
        class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"
      >
        <!-- Brand -->
        <div
          class="font-bold text-xl tracking-tight text-indigo-600 cursor-pointer"
          @click="router.push('/')"
        >
          RunSync
        </div>

        <!-- Nav Links -->
        <nav class="hidden sm:flex items-center gap-6">
          <button
            @click="router.push('/')"
            class="text-sm font-medium"
            :class="
              isActive('/')
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            "
          >
            Dashboard
          </button>

          <button
            @click="router.push('/workouts')"
            class="text-sm font-medium"
            :class="
              isActive('/workouts')
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-900'
            "
          >
            History
          </button>
        </nav>

        <!-- User / Logout -->
        <div class="flex items-center gap-4">
          <span v-if="auth.user" class="text-sm text-slate-500 hidden sm:block">
            {{ auth.user.email }}
          </span>

          <button
            @click="handleLogout"
            class="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Page Content -->
    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <slot />
    </main>
  </div>
</template>

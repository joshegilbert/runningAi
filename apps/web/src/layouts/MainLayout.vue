<script setup>
import { useAuthStore } from "../stores/auth";
import { useRouter } from "vue-router";

const auth = useAuthStore();
const router = useRouter();

function handleLogout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 font-sans">
    <header class="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div
        class="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between"
      >
        <div class="font-bold text-xl tracking-tight text-indigo-600">
          RunSync
        </div>

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

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <slot />
    </main>
  </div>
</template>

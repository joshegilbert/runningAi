<template>
  <div style="padding: 24px">
    <h1>Login</h1>
    <p>This is the login page.</p>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

function login() {
  // fake token for now
  auth.login("dev-token");
  router.push("/dashboard");
}
</script>

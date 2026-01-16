import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { createApiClient } from "../services/api";

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("token") || "");
  const user = ref(null);

  const isAuthenticated = computed(() => !!token.value);

  const api = createApiClient(() => token.value);

  function setToken(newToken) {
    token.value = newToken || "";
    if (token.value) localStorage.setItem("token", token.value);
    else localStorage.removeItem("token");
  }

  async function login(email, password) {
    const data = await api.post("/api/auth/login", { email, password });

    if (!data.token) {
      throw { status: 500, message: "Login did not return a token", data };
    }

    setToken(data.token);

    await fetchMe();

    return user.value;
  }

  async function register(name, email, password) {
    const data = await api.post("/api/auth/register", {
      name,
      email,
      password,
    });

    if (data?.token) {
      setToken(data.token);
      await fetchMe();
      return user.value;
    }

    await login(email, password);
    return user.value;
  }

  async function fetchMe() {
    if (!token.value) {
      user.value = null;
      return null;
    }
    try {
      const me = await api.get("/api/me");
      user.value = me.user ?? me;
      return me;
    } catch (err) {
      setToken("");
      user.value = null;
      throw err;
    }
  }
  function logout() {
    setToken("");
    user.value = null;
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    register,
    fetchMe,
    logout,
  };
});

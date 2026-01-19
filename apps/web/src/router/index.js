import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import LoginPage from "../pages/LoginPage.vue";
import DashboardPage from "../pages/DashboardPage.vue";
import RegisterPage from "../pages/RegisterPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/dashboard" },
    {
      path: "/login",
      component: LoginPage,
      meta: {
        requiresGuest: true,
      },
    },
    {
      path: "/dashboard",
      component: DashboardPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/register",
      component: RegisterPage,
      meta: {
        requiresGuest: true,
      },
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      // fetchMe already clears token/user if invalid
    }
  }

  const loggedIn = !!auth.token;

  if (to.meta.requiresAuth && !loggedIn) {
    return "/login";
  }

  if (to.path == "/login" && loggedIn) {
    return "/dashboard";
  }

  if (to.meta.requiresGuest && loggedIn) {
    return "/dashboard";
  }
});

export default router;

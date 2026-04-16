import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import LoginPage from "../pages/LoginPage.vue";
import DashboardPage from "../pages/DashboardPage.vue";
import RegisterPage from "../pages/RegisterPage.vue";
import LogWorkoutPage from "../pages/LogWorkoutPage.vue";
import StravaConnectedPage from "../pages/StravaConnectedPage.vue";
import ProfilePage from "../pages/ProfilePage.vue";
import DailyWorkoutPage from "../pages/DailyWorkoutPage.vue";

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
      path: "/workouts/new",
      name: "workouts-new",
      component: LogWorkoutPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/register",
      component: RegisterPage,
      meta: {
        requiresGuest: true,
      },
    },
    {
      path: "/strava/connected",
      component: StravaConnectedPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/workouts",
      name: "Workouts",
      component: () => import("../pages/WorkoutsPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/workouts/:id",
      name: "workout-detail",
      component: () => import("../pages/WorkoutDetailPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile",
      name: "profile",
      component: ProfilePage,
      meta: { requiresAuth: true },
    },
    {
      path: "/daily-workout",
      name: "daily-workout",
      component: DailyWorkoutPage,
      meta: { requiresAuth: true },
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

  const isAuthenticated = auth.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    return "/login";
  }

  if (to.meta.requiresGuest && isAuthenticated) {
    return "/dashboard";
  }
});

export default router;

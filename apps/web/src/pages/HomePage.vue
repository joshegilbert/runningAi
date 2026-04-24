<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div
        class="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"
      >
        <router-link
          to="/"
          class="text-lg font-bold text-slate-900 tracking-tight"
        >
          RunSync
        </router-link>
        <div class="flex items-center gap-3 text-sm">
          <router-link
            to="/login"
            class="text-slate-600 font-medium hover:text-slate-900"
          >
            Sign in
          </router-link>
          <router-link
            to="/register"
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Get started
          </router-link>
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div class="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div>
          <p class="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-3">
            Training in one place
          </p>
          <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            Log runs, sync Strava, and get a daily workout plan that fits your
            life.
          </h1>
          <p class="mt-4 text-lg text-slate-600 leading-relaxed">
            RunSync is your running hub: manual logging and history, Strava
            import, AI-backed daily recommendations with a sensible fallback, and
            a training profile for availability, zones, and race goals.
          </p>
          <div class="mt-8 flex flex-col sm:flex-row gap-3">
            <router-link
              to="/register"
              class="inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-lg transition-colors shadow-sm"
            >
              Get started free
            </router-link>
            <router-link
              to="/login"
              class="inline-flex justify-center items-center border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Sign in
            </router-link>
          </div>
        </div>

        <div class="space-y-4">
          <div
            class="bg-white rounded-xl border border-slate-100 shadow-sm p-5"
          >
            <h2 class="font-semibold text-slate-900">Workouts &amp; history</h2>
            <p class="text-sm text-slate-600 mt-1">
              Log runs manually and browse your workout history in one timeline.
            </p>
          </div>
          <div
            class="bg-white rounded-xl border border-slate-100 shadow-sm p-5"
          >
            <h2 class="font-semibold text-slate-900">Strava sync</h2>
            <p class="text-sm text-slate-600 mt-1">
              Connect Strava and keep imported activities in sync with your
              account.
            </p>
          </div>
          <div
            class="bg-white rounded-xl border border-slate-100 shadow-sm p-5"
          >
            <h2 class="font-semibold text-slate-900">Daily recommendation</h2>
            <p class="text-sm text-slate-600 mt-1">
              Structured workout suggestions from an AI coach, with a fallback
              when the service is unavailable.
            </p>
          </div>
          <div
            class="bg-white rounded-xl border border-slate-100 shadow-sm p-5"
          >
            <h2 class="font-semibold text-slate-900">Training profile</h2>
            <p class="text-sm text-slate-600 mt-1">
              Timezone, weekly availability, pace or heart-rate zones, and an
              optional race goal.
            </p>
          </div>
        </div>
      </div>
    </main>

    <footer class="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
      RunSync
    </footer>
  </div>
</template>

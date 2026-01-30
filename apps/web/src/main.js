import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";

import "./assets/main.css";

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

app.use(router);

router.isReady().then(async () => {
  const auth = useAuthStore(pinia);

  if (auth.toke) {
    try {
      await auth.fetchMe();
    } catch (err) {
      console.warn("Session restore failed", err);
    }
  }
  app.mount("#app");
});

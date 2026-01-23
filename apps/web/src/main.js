import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";

import "./style.css";

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

app.use(router);

app.mount("#app");

const auth = useAuthStore(pinia);

if (auth.token) {
  auth.fetchMe().catch((err) => {
    console.warn("Session restore failed", err);
  });
}

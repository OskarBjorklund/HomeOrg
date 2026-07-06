import { createApp } from "vue";
import App from "./app/App.vue";
import router from "./app/router";
import pinia from "./app/store";
import "./style.css";

const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount("#app");

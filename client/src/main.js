import { createApp } from "vue";
import dayjs from "dayjs";
import "dayjs/locale/sv";
import App from "./app/App.vue";
import router from "./app/router";
import pinia from "./app/store";
import "./style.css";

dayjs.locale("sv");

const app = createApp(App);

app.use(pinia);
app.use(router);

app.mount("#app");

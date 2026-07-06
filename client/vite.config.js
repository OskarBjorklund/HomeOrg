import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        proxy: {
            // Cookies och API-anrop går via Vite till backend — ingen CORS-konfiguration behövs.
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true
            }
        }
    }
});

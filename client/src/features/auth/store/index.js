import { defineStore } from "pinia";
import * as authApi from "../api";

// Källan till sanning för inloggad användare + aktivt hushåll.
// initialize() körs en gång av router-guarden innan första navigeringen,
// så att guards alltid har färskt auth-läge att gå på.
export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null,
        initialized: false,
        loading: false
    }),

    getters: {
        isAuthenticated: (state) => Boolean(state.user),
        hasHousehold: (state) => Boolean(state.user?.householdId)
    },

    actions: {
        async initialize() {
            if (this.initialized) {
                return;
            }

            try {
                const { user } = await authApi.fetchMe();
                this.user = user;
            } catch {
                this.user = null;
            } finally {
                this.initialized = true;
            }
        },

        // Efter login/register hämtar vi /me för att få den kanoniska
        // user-formen (inkl. householdId) i stället för att gissa lokalt.
        async refresh() {
            const { user } = await authApi.fetchMe();
            this.user = user;
        },

        async login(credentials) {
            this.loading = true;

            try {
                await authApi.login(credentials);
                await this.refresh();
            } finally {
                this.loading = false;
            }
        },

        async register(payload) {
            this.loading = true;

            try {
                await authApi.register(payload);
                await this.refresh();
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            try {
                await authApi.logout();
            } finally {
                this.user = null;
            }
        }
    }
});

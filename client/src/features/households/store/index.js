import { defineStore } from "pinia";
import * as householdsApi from "../api";
import { useAuthStore } from "../../auth/store";

export const useHouseholdsStore = defineStore("households", {
    state: () => ({
        households: [],
        loading: false
    }),

    actions: {
        async fetchMine() {
            this.loading = true;

            try {
                const { households } = await householdsApi.getMine();
                this.households = households;
            } finally {
                this.loading = false;
            }
        },

        async create(payload) {
            await householdsApi.create(payload);
            await this.fetchMine();
        },

        async join(inviteCode) {
            await householdsApi.join(inviteCode);
            await this.fetchMine();
        },

        // Valet ligger i sessionen på servern — auth-storen uppdateras
        // så att guards och UI direkt ser det nya aktiva hushållet.
        async select(householdId) {
            await householdsApi.select(householdId);

            const auth = useAuthStore();
            await auth.refresh();
        }
    }
});

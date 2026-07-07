import { defineStore } from "pinia";
import * as choresApi from "../api";

export const useChoresStore = defineStore("chores", {
    state: () => ({
        chores: [],
        includeArchived: false,
        loading: false
    }),

    actions: {
        async fetch() {
            this.loading = true;

            try {
                const { chores } = await choresApi.getChores(this.includeArchived);
                this.chores = chores;
            } finally {
                this.loading = false;
            }
        },

        // Mutationer hämtar om listan — enkelt och alltid konsekvent
        // med serverns sanning (inga lokala gissningar).
        async create(payload) {
            await choresApi.createChore(payload);
            await this.fetch();
        },

        async update(id, payload) {
            await choresApi.updateChore(id, payload);
            await this.fetch();
        },

        async setArchived(id, archived) {
            await choresApi.setArchived(id, archived);
            await this.fetch();
        },

        async remove(id) {
            await choresApi.deleteChore(id);
            await this.fetch();
        }
    }
});

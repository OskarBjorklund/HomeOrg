import { defineStore } from "pinia";
import * as instancesApi from "../api";

export const useChoreInstancesStore = defineStore("choreInstances", {
    state: () => ({
        instances: [],
        statusFilter: "",
        loading: false
    }),

    actions: {
        async fetch() {
            this.loading = true;

            try {
                const params = {};

                if (this.statusFilter) {
                    params.status = this.statusFilter;
                }

                const { instances } = await instancesApi.getInstances(params);
                this.instances = instances;
            } finally {
                this.loading = false;
            }
        },

        // Alla åtgärder returnerar den uppdaterade instansen —
        // vi byter ut den i listan i stället för att hämta om allt.
        replaceInstance(updated) {
            const index = this.instances.findIndex((item) => item.id === updated.id);

            if (index !== -1) {
                this.instances.splice(index, 1, updated);
            }
        },

        async claim(id) {
            const { instance } = await instancesApi.claimInstance(id);
            this.replaceInstance(instance);
        },

        async unclaim(id) {
            const { instance } = await instancesApi.unclaimInstance(id);
            this.replaceInstance(instance);
        },

        async complete(id) {
            const { instance } = await instancesApi.completeInstance(id);
            this.replaceInstance(instance);
        },

        async approve(id) {
            const { instance } = await instancesApi.approveInstance(id);
            this.replaceInstance(instance);
        },

        async reject(id, reason) {
            const { instance } = await instancesApi.rejectInstance(id, reason);
            this.replaceInstance(instance);
        },

        async create(payload) {
            await instancesApi.createInstance(payload);
            await this.fetch();
        },

        async generate(daysAhead) {
            const { generated } = await instancesApi.generateRecurring(daysAhead);
            await this.fetch();

            return generated;
        },

        async remove(id) {
            await instancesApi.deleteInstance(id);
            this.instances = this.instances.filter((item) => item.id !== id);
        }
    }
});

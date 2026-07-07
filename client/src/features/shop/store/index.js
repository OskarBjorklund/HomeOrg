import { defineStore } from "pinia";
import * as shopApi from "../api";

export const useShopStore = defineStore("shop", {
    state: () => ({
        items: [],
        presets: [],
        purchases: [],
        loading: false
    }),

    actions: {
        async fetchItems() {
            this.loading = true;

            try {
                const { items } = await shopApi.getItems();
                this.items = items;
            } finally {
                this.loading = false;
            }
        },

        async fetchPresets() {
            const { presets } = await shopApi.getPresets();
            this.presets = presets;
        },

        async fetchPurchases() {
            const { purchases } = await shopApi.getPurchases();
            this.purchases = purchases;
        },

        async createItem(payload) {
            await shopApi.createItem(payload);
            await Promise.all([this.fetchItems(), this.fetchPresets()]);
        },

        async deleteItem(id) {
            await shopApi.deleteItem(id);
            await this.fetchItems();
        },

        async deletePreset(id) {
            await shopApi.deletePreset(id);
            await this.fetchPresets();
        },

        // Köpet returnerar { purchase, inventoryItem, balance }.
        // Försvinner varan efter köp plockas den bort ur listan av servern
        // vid nästa hämtning — vi hämtar om för att spegla sanningen.
        async buy(id) {
            const result = await shopApi.buyItem(id);

            await Promise.all([this.fetchItems(), this.fetchPurchases()]);

            return result;
        }
    }
});

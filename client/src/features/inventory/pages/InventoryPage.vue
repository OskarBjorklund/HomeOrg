<script setup>
import { computed, onMounted, ref } from "vue";
import * as inventoryApi from "../api";
import { useHouseholdsStore } from "../../households/store";
import { usesLabel } from "../../shop/constants";

const households = useHouseholdsStore();

const items = ref([]);
const loading = ref(false);
const error = ref("");

// Managers kan titta på en annan medlems saker.
const viewMemberId = ref("");

const myMemberId = computed(() => households.myMember?.id ?? null);
const viewingOther = computed(
    () => viewMemberId.value !== "" && Number(viewMemberId.value) !== myMemberId.value
);

async function fetchItems() {
    loading.value = true;
    error.value = "";

    try {
        const params = viewMemberId.value ? { memberId: Number(viewMemberId.value) } : {};
        const data = await inventoryApi.getInventory(params);
        items.value = data.items;
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

onMounted(async () => {
    try {
        await households.fetchMembers();
    } catch (err) {
        error.value = err.message;
    }

    await fetchItems();
});

async function activate(item) {
    error.value = "";

    try {
        const data = await inventoryApi.activateItem(item.id);
        const index = items.value.findIndex((i) => i.id === item.id);

        if (index !== -1) {
            items.value.splice(index, 1, data.item);
        }
    } catch (err) {
        error.value = err.message;
    }
}

function usesLeftLabel(item) {
    if (item.usesTotal === null) {
        return "Permanent";
    }

    if (item.status === "used_up") {
        return "Förbrukad";
    }

    return `${item.usesLeft} av ${item.usesTotal} kvar`;
}
</script>

<template>
    <div class="page">
        <div class="page-head">
            <h1>Mina saker</h1>

            <select
                v-if="households.isManager"
                v-model="viewMemberId"
                class="member-select"
                @change="fetchItems"
            >
                <option value="">Mina egna</option>
                <option v-for="member in households.members" :key="member.id" :value="member.id">
                    {{ member.displayName }}
                </option>
            </select>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div v-if="loading" class="muted">Laddar...</div>

        <div v-else-if="items.length" class="inventory-grid">
            <div
                v-for="item in items"
                :key="item.id"
                class="card inventory-item"
                :class="{ depleted: item.status === 'used_up' }"
            >
                <div>
                    <strong>{{ item.title }}</strong>
                    <p v-if="item.description" class="muted item-desc">{{ item.description }}</p>

                    <div class="item-badges">
                        <span class="badge">{{ usesLabel(item.usesTotal) }}</span>
                        <span class="badge">{{ usesLeftLabel(item) }}</span>
                        <span v-if="item.activationCount > 0" class="badge">
                            Använd {{ item.activationCount }} ggr
                        </span>
                    </div>
                </div>

                <button
                    v-if="!viewingOther"
                    class="btn btn-primary"
                    :disabled="item.status === 'used_up'"
                    @click="activate(item)"
                >
                    {{ item.status === "used_up" ? "Förbrukad" : "Använd" }}
                </button>
            </div>
        </div>

        <p v-else class="muted">
            Inga saker här ännu — köp något i shoppen!
        </p>
    </div>
</template>

<style scoped>
.page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.member-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.95rem;
}

.inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
}

.inventory-item {
    padding: 1.1rem 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.75rem;
}

.inventory-item.depleted {
    opacity: 0.6;
}

.item-desc {
    margin: 0.25rem 0 0;
    font-size: 0.9rem;
}

.item-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.5rem;
}

.item-badges .badge {
    margin-left: 0;
}
</style>

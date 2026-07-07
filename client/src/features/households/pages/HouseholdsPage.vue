<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useHouseholdsStore } from "../store";
import { useAuthStore } from "../../auth/store";

const router = useRouter();
const store = useHouseholdsStore();
const auth = useAuthStore();

const createForm = reactive({ name: "", description: "" });
const joinCode = ref("");
const error = ref("");

onMounted(() => {
    store.fetchMine().catch((err) => {
        error.value = err.message;
    });
});

async function run(action) {
    error.value = "";

    try {
        await action();
    } catch (err) {
        error.value = err.message;
    }
}

function selectHousehold(id) {
    return run(async () => {
        await store.select(id);
        await router.push({ name: "home" });
    });
}

function createHousehold() {
    return run(async () => {
        await store.create({ ...createForm });
        createForm.name = "";
        createForm.description = "";
    });
}

function joinHousehold() {
    return run(async () => {
        await store.join(joinCode.value);
        joinCode.value = "";
    });
}
</script>

<template>
    <div class="page">
        <h1>Mina hushåll</h1>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div v-if="store.loading" class="muted">Laddar...</div>

        <div v-else-if="store.households.length" class="household-list">
            <div
                v-for="household in store.households"
                :key="household.id"
                class="card household-card"
            >
                <div>
                    <strong>{{ household.name }}</strong>
                    <span class="badge">{{ household.role }}</span>
                    <p v-if="household.description" class="muted">
                        {{ household.description }}
                    </p>
                </div>

                <div class="household-card-actions">
                    <RouterLink
                        v-if="auth.user?.householdId === household.id"
                        class="btn btn-ghost"
                        :to="{ name: 'household-admin' }"
                    >
                        Hantera
                    </RouterLink>

                    <button
                        class="btn"
                        :class="auth.user?.householdId === household.id ? 'btn-ghost' : 'btn-primary'"
                        @click="selectHousehold(household.id)"
                    >
                        {{ auth.user?.householdId === household.id ? "Aktivt" : "Välj" }}
                    </button>
                </div>
            </div>
        </div>

        <p v-else class="muted">Du är inte med i något hushåll ännu.</p>

        <div class="household-actions">
            <form class="card action-card" @submit.prevent="createHousehold">
                <h2>Skapa hushåll</h2>

                <label class="field">
                    <span>Namn</span>
                    <input v-model="createForm.name" type="text" required />
                </label>

                <label class="field">
                    <span>Beskrivning (valfri)</span>
                    <input v-model="createForm.description" type="text" />
                </label>

                <button class="btn btn-primary" type="submit">Skapa</button>
            </form>

            <form class="card action-card" @submit.prevent="joinHousehold">
                <h2>Gå med via kod</h2>

                <label class="field">
                    <span>Inbjudningskod</span>
                    <input v-model="joinCode" type="text" required />
                </label>

                <button class="btn btn-primary" type="submit">Gå med</button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.household-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 2rem;
}

.household-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
}

.household-card-actions {
    display: flex;
    gap: 0.5rem;
}

.household-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
}

.action-card {
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.action-card h2 {
    margin: 0;
    font-size: 1.1rem;
}
</style>

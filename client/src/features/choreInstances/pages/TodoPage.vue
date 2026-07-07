<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useChoreInstancesStore } from "../store";
import { useChoresStore } from "../../chores/store";
import { useHouseholdsStore } from "../../households/store";
import { StatusLabels, StatusFilterOptions, CompletableStatuses } from "../constants";
import * as permissions from "../permissions";

const store = useChoreInstancesStore();
const chores = useChoresStore();
const households = useHouseholdsStore();

const error = ref("");
const info = ref("");
const showCreate = ref(false);

const today = new Date().toISOString().slice(0, 10);

const createForm = reactive({
    choreId: "",
    dueDate: today,
    assignedToMemberId: ""
});

const myMemberId = computed(() => households.myMember?.id ?? null);

const permissionContext = computed(() => ({
    myMemberId: myMemberId.value,
    isManager: households.isManager
}));

onMounted(async () => {
    try {
        await Promise.all([store.fetch(), households.fetchMembers(), chores.fetch()]);
    } catch (err) {
        error.value = err.message;
    }
});

function memberName(memberId) {
    return households.membersById.get(memberId)?.displayName || "Okänd";
}

function isOverdue(instance) {
    return (
        instance.dueDate < today &&
        CompletableStatuses.includes(instance.status)
    );
}

const canClaim = (instance) => permissions.canClaim(instance);
const canUnclaim = (instance) => permissions.canUnclaim(instance, permissionContext.value);
const canComplete = (instance) => permissions.canComplete(instance, permissionContext.value);

async function run(action) {
    error.value = "";
    info.value = "";

    try {
        await action();
    } catch (err) {
        error.value = err.message;
    }
}

const claim = (instance) => run(() => store.claim(instance.id));
const unclaim = (instance) => run(() => store.unclaim(instance.id));
const complete = (instance) => run(() => store.complete(instance.id));
const approve = (instance) => run(() => store.approve(instance.id));

function reject(instance) {
    const reason = window.prompt("Anledning till avvisning (valfritt):") ?? null;

    if (reason === null) {
        return;
    }

    return run(() => store.reject(instance.id, reason.trim() || null));
}

function removeInstance(instance) {
    if (!window.confirm(`Ta bort "${instance.title}" (${instance.dueDate})?`)) {
        return;
    }

    return run(() => store.remove(instance.id));
}

function generate() {
    return run(async () => {
        const generated = await store.generate();
        info.value = `Genererade ${generated.created} instanser (t.o.m. ${generated.to}).`;
    });
}

function createInstance() {
    return run(async () => {
        await store.create({
            choreId: Number(createForm.choreId),
            dueDate: createForm.dueDate,
            assignedToMemberId: createForm.assignedToMemberId
                ? Number(createForm.assignedToMemberId)
                : null
        });

        showCreate.value = false;
        createForm.choreId = "";
        createForm.dueDate = today;
        createForm.assignedToMemberId = "";
    });
}

async function changeFilter() {
    await run(() => store.fetch());
}
</script>

<template>
    <div class="page">
        <div class="page-head">
            <h1>Att göra</h1>

            <div class="page-actions">
                <select v-model="store.statusFilter" class="filter-select" @change="changeFilter">
                    <option v-for="opt in StatusFilterOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                    </option>
                </select>

                <template v-if="households.isManager">
                    <button class="btn btn-ghost" @click="generate">Generera återkommande</button>
                    <button class="btn btn-primary" @click="showCreate = !showCreate">
                        {{ showCreate ? "Stäng" : "Ny instans" }}
                    </button>
                </template>
            </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="info" class="muted">{{ info }}</p>

        <form v-if="showCreate" class="card create-form" @submit.prevent="createInstance">
            <label class="field">
                <span>Syssla</span>
                <select v-model="createForm.choreId" required>
                    <option value="" disabled>Välj syssla</option>
                    <option v-for="chore in chores.chores" :key="chore.id" :value="chore.id">
                        {{ chore.title }} ({{ chore.points }} p)
                    </option>
                </select>
            </label>

            <label class="field">
                <span>Datum</span>
                <input v-model="createForm.dueDate" type="date" required />
            </label>

            <label class="field">
                <span>Tilldela (valfritt)</span>
                <select v-model="createForm.assignedToMemberId">
                    <option value="">Ingen</option>
                    <option v-for="member in households.members" :key="member.id" :value="member.id">
                        {{ member.displayName }}
                    </option>
                </select>
            </label>

            <button class="btn btn-primary" type="submit">Skapa</button>
        </form>

        <div v-if="store.loading" class="muted">Laddar...</div>

        <div v-else-if="store.instances.length" class="instance-list">
            <div
                v-for="instance in store.instances"
                :key="instance.id"
                class="card instance-card"
                :class="{ done: instance.status === 'approved' }"
            >
                <div class="instance-info">
                    <div class="instance-title">
                        <strong>{{ instance.title }}</strong>
                        <span class="badge">{{ instance.points }} p</span>
                        <span class="badge status" :class="`status-${instance.status}`">
                            {{ StatusLabels[instance.status] }}
                        </span>
                    </div>

                    <div class="instance-meta muted">
                        <span :class="{ overdue: isOverdue(instance) }">
                            {{ instance.dueDate }}
                            <template v-if="isOverdue(instance)">(försenad)</template>
                        </span>

                        <span v-if="instance.assignedToMemberId">
                            · Tilldelad: {{ memberName(instance.assignedToMemberId) }}
                        </span>
                        <span v-else-if="instance.claimedByMemberId">
                            · Tagen av: {{ memberName(instance.claimedByMemberId) }}
                        </span>

                        <span v-if="instance.completedByMemberId">
                            · Utförd av: {{ memberName(instance.completedByMemberId) }}
                        </span>

                        <span v-if="instance.status === 'rejected' && instance.rejectionReason">
                            · Avvisad: "{{ instance.rejectionReason }}"
                        </span>
                    </div>
                </div>

                <div class="instance-actions">
                    <button v-if="canClaim(instance)" class="btn btn-ghost" @click="claim(instance)">
                        Ta
                    </button>
                    <button v-if="canUnclaim(instance)" class="btn btn-ghost" @click="unclaim(instance)">
                        Släpp
                    </button>
                    <button v-if="canComplete(instance)" class="btn btn-primary" @click="complete(instance)">
                        Klar
                    </button>

                    <template v-if="households.isManager && instance.status === 'completed'">
                        <button class="btn btn-primary" @click="approve(instance)">Godkänn</button>
                        <button class="btn btn-ghost" @click="reject(instance)">Avvisa</button>
                    </template>

                    <button
                        v-if="households.isManager && instance.status !== 'approved'"
                        class="btn btn-ghost"
                        @click="removeInstance(instance)"
                    >
                        Ta bort
                    </button>
                </div>
            </div>
        </div>

        <p v-else class="muted">Inga instanser att visa.</p>
    </div>
</template>

<style scoped>
.page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.page-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.filter-select,
.field select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.95rem;
}

.create-form {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
}

.instance-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.instance-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1.25rem;
}

.instance-card.done {
    opacity: 0.65;
}

.instance-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}

.instance-meta {
    font-size: 0.85rem;
    margin-top: 0.2rem;
}

.overdue {
    color: var(--color-danger);
    font-weight: 600;
}

.status-approved {
    background: #dcfce7;
    color: #15803d;
}

.status-completed {
    background: #fef3c7;
    color: #b45309;
}

.status-rejected {
    background: #fee2e2;
    color: #b91c1c;
}

.instance-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
}
</style>

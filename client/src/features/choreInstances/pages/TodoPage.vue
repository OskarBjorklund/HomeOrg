<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import dayjs from "dayjs";
import { useToday } from "../../../shared/composables/useToday";
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

// null | "quick" | "template" — vilket skapa-formulär som är öppet.
const openForm = ref(null);

// Reaktivt "idag" — uppdateras vid midnatt och när fliken får fokus,
// så att en långlivad flik inte fastnar på gårdagens datum.
const today = useToday();
const tomorrow = computed(() => dayjs(today.value).add(1, "day").format("YYYY-MM-DD"));

const createForm = reactive({
    choreId: "",
    dueDate: today.value,
    assignedToMemberId: ""
});

const quickForm = reactive({
    title: "",
    points: 10,
    dueDate: today.value,
    assignedToMemberId: ""
});

// Sidan visar bara idag (inkl. försenat) och imorgon — framtiden bor i
// kalendern. Store:n hämtar redan bara t.o.m. imorgon.
const sections = computed(() => [
    {
        key: "today",
        title: "Idag",
        items: store.instances.filter((instance) => instance.dueDate <= today.value),
        emptyText: "Inget att göra idag."
    },
    {
        key: "tomorrow",
        title: "Imorgon",
        items: store.instances.filter((instance) => instance.dueDate === tomorrow.value),
        emptyText: "Inget planerat imorgon."
    }
]);

// Nytt dygn: hämta om listan (store:ns to-gräns flyttas) och flytta fram
// formulärens datumförslag från gårdagen.
watch(today, (newToday, oldToday) => {
    if (createForm.dueDate === oldToday) {
        createForm.dueDate = newToday;
    }

    if (quickForm.dueDate === oldToday) {
        quickForm.dueDate = newToday;
    }

    store.fetch().catch((err) => {
        error.value = err.message;
    });
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
        instance.dueDate < today.value &&
        CompletableStatuses.includes(instance.status)
    );
}

const canClaim = (instance) => permissions.canClaim(instance);
const canUnclaim = (instance) => permissions.canUnclaim(instance, permissionContext.value);
const canComplete = (instance) => permissions.canComplete(instance, permissionContext.value);
const canUncomplete = (instance) => permissions.canUncomplete(instance, permissionContext.value);
const canBuyout = (instance) => permissions.canBuyout(instance, permissionContext.value);

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
const uncomplete = (instance) => run(() => store.uncomplete(instance.id));
const approve = (instance) => run(() => store.approve(instance.id));

function buyout(instance) {
    const cost = instance.points * 2;

    if (
        !window.confirm(
            `Köp bort "${instance.title}" för ${cost} p? Uppgiften blir fri att ta för ${cost} p.`
        )
    ) {
        return;
    }

    return run(async () => {
        await store.buyout(instance.id);
        info.value = `Uppgiften är friköpt — den ligger nu öppen för ${cost} p.`;
    });
}

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

        openForm.value = null;
        createForm.choreId = "";
        createForm.dueDate = today.value;
        createForm.assignedToMemberId = "";
    });
}

function createQuick() {
    return run(async () => {
        await store.quickCreate({
            title: quickForm.title,
            points: Number(quickForm.points),
            dueDate: quickForm.dueDate,
            assignedToMemberId: quickForm.assignedToMemberId
                ? Number(quickForm.assignedToMemberId)
                : null
        });

        openForm.value = null;
        quickForm.title = "";
        quickForm.points = 10;
        quickForm.dueDate = today.value;
        quickForm.assignedToMemberId = "";
    });
}

function toggleForm(name) {
    openForm.value = openForm.value === name ? null : name;
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
                    <button class="btn btn-ghost" @click="toggleForm('template')">
                        {{ openForm === 'template' ? "Stäng" : "Från mall" }}
                    </button>
                    <button class="btn btn-primary" @click="toggleForm('quick')">
                        {{ openForm === 'quick' ? "Stäng" : "Snabb uppgift" }}
                    </button>
                </template>
            </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="info" class="muted">{{ info }}</p>

        <form v-if="openForm === 'quick'" class="card create-form" @submit.prevent="createQuick">
            <label class="field grow">
                <span>Vad ska göras?</span>
                <input
                    v-model="quickForm.title"
                    type="text"
                    placeholder="t.ex. Flytta soffan innan gästerna kommer"
                    required
                />
            </label>

            <label class="field">
                <span>Poäng</span>
                <input v-model="quickForm.points" type="number" min="0" />
            </label>

            <label class="field">
                <span>Datum</span>
                <input v-model="quickForm.dueDate" type="date" required />
            </label>

            <label class="field">
                <span>Tilldela (valfritt)</span>
                <select v-model="quickForm.assignedToMemberId">
                    <option value="">Ingen</option>
                    <option v-for="member in households.members" :key="member.id" :value="member.id">
                        {{ member.displayName }}
                    </option>
                </select>
            </label>

            <button class="btn btn-primary" type="submit">Skapa</button>
        </form>

        <form v-if="openForm === 'template'" class="card create-form" @submit.prevent="createInstance">
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

        <template v-else>
            <section v-for="section in sections" :key="section.key" class="day-section">
                <h2 class="day-heading">{{ section.title }}</h2>

                <div v-if="section.items.length" class="instance-list">
                    <div
                        v-for="instance in section.items"
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
                            <button v-if="canUncomplete(instance)" class="btn btn-ghost" @click="uncomplete(instance)">
                                Ångra
                            </button>
                            <button v-if="canBuyout(instance)" class="btn btn-ghost" @click="buyout(instance)">
                                Köp bort ({{ instance.points * 2 }} p)
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

                <p v-else class="muted">{{ section.emptyText }}</p>
            </section>
        </template>
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

.create-form .grow {
    flex: 1;
    min-width: 220px;
}

.day-section {
    margin-bottom: 1.75rem;
}

.day-heading {
    font-size: 1.05rem;
    margin: 0 0 0.6rem;
    padding-bottom: 0.35rem;
    border-bottom: 2px solid var(--color-border);
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

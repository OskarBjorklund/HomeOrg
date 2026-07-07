<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useChoresStore } from "../store";
import { useHouseholdsStore } from "../../households/store";
import * as choresApi from "../api";
import {
    RecurrenceOptions,
    PriorityOptions,
    DifficultyOptions,
    AssignmentModeOptions,
    RecurrenceLabels,
    PriorityLabels,
    DifficultyLabels,
    PoolModes
} from "../constants";

const store = useChoresStore();
const households = useHouseholdsStore();

const error = ref("");
const showForm = ref(false);

function emptyForm() {
    return {
        id: null,
        title: "",
        description: "",
        points: 10,
        difficulty: "",
        priority: "normal",
        recurrenceType: "none",
        recurrenceInterval: 1,
        estimatedMinutes: "",
        requiresApproval: false,
        visibleToChildren: true,
        assignmentMode: "anyone",
        assignedMemberIds: []
    };
}

const form = reactive(emptyForm());

const isEditing = computed(() => form.id !== null);
const usesPool = computed(() => PoolModes.includes(form.assignmentMode));

onMounted(async () => {
    try {
        await Promise.all([store.fetch(), households.fetchMembers()]);
    } catch (err) {
        error.value = err.message;
    }
});

function resetForm() {
    Object.assign(form, emptyForm());
    showForm.value = false;
}

function startCreate() {
    Object.assign(form, emptyForm());
    showForm.value = true;
}

async function startEdit(choreId) {
    error.value = "";

    try {
        // Listan saknar assignedMemberIds — hämta hela templaten.
        const { chore } = await choresApi.getChore(choreId);

        Object.assign(form, {
            id: chore.id,
            title: chore.title,
            description: chore.description || "",
            points: chore.points,
            difficulty: chore.difficulty || "",
            priority: chore.priority,
            recurrenceType: chore.recurrenceType,
            recurrenceInterval: chore.recurrenceInterval,
            estimatedMinutes: chore.estimatedMinutes ?? "",
            requiresApproval: Boolean(chore.requiresApproval),
            visibleToChildren: Boolean(chore.visibleToChildren),
            assignmentMode: chore.assignmentMode,
            assignedMemberIds: [...chore.assignedMemberIds]
        });

        showForm.value = true;
    } catch (err) {
        error.value = err.message;
    }
}

function toPayload() {
    const payload = {
        title: form.title,
        description: form.description || null,
        points: Number(form.points),
        difficulty: form.difficulty || null,
        priority: form.priority,
        recurrenceType: form.recurrenceType,
        recurrenceInterval: Number(form.recurrenceInterval) || 1,
        estimatedMinutes: form.estimatedMinutes === "" ? null : Number(form.estimatedMinutes),
        requiresApproval: form.requiresApproval,
        visibleToChildren: form.visibleToChildren,
        assignmentMode: form.assignmentMode
    };

    if (usesPool.value) {
        payload.assignedMemberIds = form.assignedMemberIds;
    }

    return payload;
}

async function submit() {
    error.value = "";

    try {
        if (isEditing.value) {
            await store.update(form.id, toPayload());
        } else {
            await store.create(toPayload());
        }

        resetForm();
    } catch (err) {
        error.value = err.message;
    }
}

async function toggleArchive(chore) {
    error.value = "";

    try {
        await store.setArchived(chore.id, chore.isArchived !== 1);
    } catch (err) {
        error.value = err.message;
    }
}

async function removeChore(chore) {
    if (!window.confirm(`Ta bort "${chore.title}"? Alla instanser försvinner också.`)) {
        return;
    }

    error.value = "";

    try {
        await store.remove(chore.id);
    } catch (err) {
        error.value = err.message;
    }
}

async function toggleArchivedFilter() {
    store.includeArchived = !store.includeArchived;
    await store.fetch();
}
</script>

<template>
    <div class="page">
        <div class="page-head">
            <h1>Sysslor</h1>

            <div class="page-actions">
                <button class="btn btn-ghost" @click="toggleArchivedFilter">
                    {{ store.includeArchived ? "Dölj arkiverade" : "Visa arkiverade" }}
                </button>
                <button
                    v-if="households.isManager"
                    class="btn btn-primary"
                    @click="showForm && !isEditing ? resetForm() : startCreate()"
                >
                    {{ showForm && !isEditing ? "Stäng" : "Ny syssla" }}
                </button>
            </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <form v-if="showForm" class="card chore-form" @submit.prevent="submit">
            <h2>{{ isEditing ? "Redigera syssla" : "Ny syssla" }}</h2>

            <div class="form-grid">
                <label class="field span-2">
                    <span>Titel</span>
                    <input v-model="form.title" type="text" required />
                </label>

                <label class="field span-2">
                    <span>Beskrivning</span>
                    <input v-model="form.description" type="text" />
                </label>

                <label class="field">
                    <span>Poäng</span>
                    <input v-model="form.points" type="number" min="0" required />
                </label>

                <label class="field">
                    <span>Uppskattad tid (min)</span>
                    <input v-model="form.estimatedMinutes" type="number" min="1" />
                </label>

                <label class="field">
                    <span>Svårighetsgrad</span>
                    <select v-model="form.difficulty">
                        <option v-for="opt in DifficultyOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </label>

                <label class="field">
                    <span>Prioritet</span>
                    <select v-model="form.priority">
                        <option v-for="opt in PriorityOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </label>

                <label class="field">
                    <span>Återkommer</span>
                    <select v-model="form.recurrenceType">
                        <option v-for="opt in RecurrenceOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </label>

                <label v-if="form.recurrenceType !== 'none'" class="field">
                    <span>Intervall</span>
                    <input v-model="form.recurrenceInterval" type="number" min="1" />
                </label>

                <label class="field">
                    <span>Tilldelning</span>
                    <select v-model="form.assignmentMode">
                        <option v-for="opt in AssignmentModeOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </label>

                <div v-if="usesPool" class="field span-2">
                    <span>Medlemmar</span>
                    <div class="member-picker">
                        <label
                            v-for="member in households.members"
                            :key="member.id"
                            class="checkbox"
                        >
                            <input
                                v-model="form.assignedMemberIds"
                                type="checkbox"
                                :value="member.id"
                            />
                            {{ member.displayName }}
                        </label>
                    </div>
                </div>

                <label class="checkbox">
                    <input v-model="form.requiresApproval" type="checkbox" />
                    Kräver godkännande
                </label>

                <label class="checkbox">
                    <input v-model="form.visibleToChildren" type="checkbox" />
                    Synlig för barn
                </label>
            </div>

            <div class="form-buttons">
                <button class="btn btn-primary" type="submit">
                    {{ isEditing ? "Spara" : "Skapa" }}
                </button>
                <button class="btn btn-ghost" type="button" @click="resetForm">Avbryt</button>
            </div>
        </form>

        <div v-if="store.loading" class="muted">Laddar...</div>

        <div v-else-if="store.chores.length" class="chore-list">
            <div
                v-for="chore in store.chores"
                :key="chore.id"
                class="card chore-card"
                :class="{ archived: chore.isArchived === 1 }"
            >
                <div class="chore-info">
                    <strong>{{ chore.title }}</strong>
                    <span class="badge">{{ chore.points }} p</span>
                    <span v-if="chore.recurrenceType !== 'none'" class="badge">
                        {{ RecurrenceLabels[chore.recurrenceType] }}
                        <template v-if="chore.recurrenceInterval > 1">
                            (var {{ chore.recurrenceInterval }})
                        </template>
                    </span>
                    <span v-if="chore.difficulty" class="badge">
                        {{ DifficultyLabels[chore.difficulty] }}
                    </span>
                    <span v-if="chore.priority !== 'normal'" class="badge">
                        {{ PriorityLabels[chore.priority] }}
                    </span>
                    <span v-if="chore.requiresApproval === 1" class="badge">Godkännande</span>
                    <span v-if="chore.isArchived === 1" class="badge">Arkiverad</span>

                    <p v-if="chore.description" class="muted chore-desc">
                        {{ chore.description }}
                    </p>
                </div>

                <div v-if="households.isManager" class="chore-actions">
                    <button class="btn btn-ghost" @click="startEdit(chore.id)">Redigera</button>
                    <button class="btn btn-ghost" @click="toggleArchive(chore)">
                        {{ chore.isArchived === 1 ? "Återställ" : "Arkivera" }}
                    </button>
                    <button class="btn btn-ghost" @click="removeChore(chore)">Ta bort</button>
                </div>
            </div>
        </div>

        <p v-else class="muted">Inga sysslor ännu.</p>
    </div>
</template>

<style scoped>
.page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.page-actions {
    display: flex;
    gap: 0.5rem;
}

.chore-form {
    padding: 1.25rem;
    margin-bottom: 1.5rem;
}

.chore-form h2 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem 1rem;
}

.span-2 {
    grid-column: span 2;
}

.field select {
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    font-size: 1rem;
    background: var(--color-surface);
    color: var(--color-text);
}

.checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
}

.member-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.form-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
}

.chore-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.chore-card {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
}

.chore-card.archived {
    opacity: 0.6;
}

.chore-desc {
    margin: 0.25rem 0 0;
    font-size: 0.9rem;
}

.chore-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
}
</style>

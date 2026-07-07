<script setup>
import { computed, onMounted, ref, watch } from "vue";
import dayjs from "dayjs";
import * as achievementsApi from "../api";
import { useHouseholdsStore } from "../../households/store";

const households = useHouseholdsStore();

const selectedMemberId = ref(null);
const data = ref(null);
const loading = ref(false);
const error = ref("");

const memberOptions = computed(() =>
    households.members.map((member) => ({
        value: member.id,
        label: member.displayName
    }))
);

const isMe = computed(() => selectedMemberId.value === households.myMember?.id);

async function fetchAchievements() {
    loading.value = true;
    error.value = "";

    try {
        const response = await achievementsApi.getAchievements(selectedMemberId.value);

        data.value = response.achievements;
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

watch(selectedMemberId, fetchAchievements);

onMounted(async () => {
    try {
        await households.fetchMembers();
    } catch (err) {
        error.value = err.message;

        return;
    }

    // Startläge: mina egna (watchern triggar hämtningen).
    selectedMemberId.value = households.myMember?.id ?? null;
});

function progressPercent(item) {
    return Math.round((item.progress / item.threshold) * 100);
}

function formatDate(value) {
    return dayjs(value).format("D MMMM YYYY");
}
</script>

<template>
    <div class="page achievements-page">
        <div class="page-head">
            <h1>Utmärkelser</h1>

            <div class="head-controls">
                <span v-if="data" class="badge">
                    {{ data.unlockedCount }} / {{ data.totalCount }} upplåsta
                </span>

                <select v-model="selectedMemberId" class="member-select">
                    <option v-for="opt in memberOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                    </option>
                </select>
            </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <p v-if="data && !isMe" class="muted">
            Visar utmärkelser för {{ households.membersById.get(selectedMemberId)?.displayName }}.
        </p>

        <div v-if="data" class="badge-grid" :class="{ loading }">
            <article
                v-for="item in data.achievements"
                :key="item.key"
                class="card badge-card"
                :class="{ locked: !item.unlocked }"
            >
                <span class="badge-icon">{{ item.icon }}</span>

                <div class="badge-body">
                    <strong>{{ item.title }}</strong>
                    <p class="muted badge-description">{{ item.description }}</p>

                    <p v-if="item.unlocked" class="badge-unlocked">
                        Upplåst {{ formatDate(item.unlockedAt) }}
                    </p>

                    <template v-else>
                        <div class="progress-track">
                            <div
                                class="progress-fill"
                                :style="{ width: progressPercent(item) + '%' }"
                            ></div>
                        </div>
                        <p class="muted badge-progress">
                            {{ item.progress }} / {{ item.threshold }}
                        </p>
                    </template>
                </div>
            </article>
        </div>

        <p v-else-if="!error" class="muted">Laddar…</p>
    </div>
</template>

<style scoped>
.achievements-page {
    max-width: 1080px;
}

.page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.head-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.member-select {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    font: inherit;
}

.badge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
}

.badge-grid.loading {
    opacity: 0.6;
}

.badge-card {
    display: flex;
    gap: 0.9rem;
    padding: 1rem;
}

.badge-card.locked {
    opacity: 0.65;
}

.badge-card.locked .badge-icon {
    filter: grayscale(1);
}

.badge-icon {
    font-size: 2rem;
    line-height: 1;
}

.badge-body {
    flex: 1;
    min-width: 0;
}

.badge-description {
    margin: 0.2rem 0 0.5rem;
    font-size: 0.85rem;
}

.badge-unlocked {
    margin: 0;
    font-size: 0.85rem;
    color: #15803d;
    font-weight: 600;
}

.progress-track {
    height: 6px;
    border-radius: 3px;
    background: var(--color-surface-alt);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--color-primary);
}

.badge-progress {
    margin: 0.3rem 0 0;
    font-size: 0.8rem;
}
</style>

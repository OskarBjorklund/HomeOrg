<script setup>
import { onMounted, ref, watch } from "vue";
import { useToday } from "../../../shared/composables/useToday";
import { getDashboard } from "../api";

const today = useToday();
const dashboard = ref(null);
const error = ref("");

async function fetchDashboard() {
    try {
        const data = await getDashboard();
        dashboard.value = data.dashboard;
    } catch (err) {
        error.value = err.message;
    }
}

onMounted(fetchDashboard);

// Nytt dygn: "idag"-statistiken gäller ett nytt datum — hämta om.
watch(today, fetchDashboard);
</script>

<template>
    <div class="page">
        <h1>Översikt</h1>

        <p v-if="error" class="form-error">{{ error }}</p>
        <div v-else-if="!dashboard" class="muted">Laddar...</div>

        <template v-else>
            <div class="stat-grid">
                <div class="card stat-card">
                    <span class="stat-value">{{ dashboard.stats.dueToday }}</span>
                    <span class="stat-label">Att göra idag</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-value">{{ dashboard.stats.overdue }}</span>
                    <span class="stat-label">Försenade</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-value">{{ dashboard.stats.pendingApproval }}</span>
                    <span class="stat-label">Väntar godkännande</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-value">{{ dashboard.stats.approvedToday }}</span>
                    <span class="stat-label">Klara idag</span>
                </div>
            </div>

            <div class="dash-columns">
                <section class="card dash-section">
                    <h2>Dagens sysslor</h2>

                    <ul v-if="dashboard.today.length" class="item-list">
                        <li v-for="item in dashboard.today" :key="item.id">
                            <strong>{{ item.title }}</strong>
                            <span class="badge">{{ item.points }} p</span>
                        </li>
                    </ul>
                    <p v-else class="muted">Inget att göra idag.</p>
                </section>

                <section class="card dash-section">
                    <h2>Poängställning</h2>

                    <ul class="item-list">
                        <li v-for="member in dashboard.members" :key="member.id">
                            <strong>{{ member.displayName }}</strong>
                            <span class="badge">{{ member.pointsBalance }} p</span>
                        </li>
                    </ul>
                </section>
            </div>
        </template>
    </div>
</template>

<style scoped>
.stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.stat-card {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
}

.stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-primary);
}

.stat-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
}

.dash-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
}

.dash-section {
    padding: 1.25rem;
}

.dash-section h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
}

.item-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.item-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}
</style>

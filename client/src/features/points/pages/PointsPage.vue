<script setup>
import { onMounted, reactive, ref } from "vue";
import * as pointsApi from "../api";
import { getLeaderboard } from "../../leaderboard/api";
import { useHouseholdsStore } from "../../households/store";

const households = useHouseholdsStore();

const balance = ref(null);
const ledger = ref([]);
const leaderboard = ref(null);
const period = ref("week");
const error = ref("");
const info = ref("");

const ReasonLabels = {
    chore_approved: "Syssla",
    chore_undone: "Ångrad syssla",
    chore_buyout: "Friköpt syssla",
    manual_adjustment: "Justering",
    shop_purchase: "Köp"
};

const PeriodOptions = [
    { value: "week", label: "Denna vecka" },
    { value: "month", label: "Denna månad" },
    { value: "all", label: "Totalt" }
];

const adjustForm = reactive({
    memberId: "",
    amount: 10,
    note: ""
});

async function fetchAll() {
    const [me, ledgerData] = await Promise.all([
        pointsApi.getMyPoints(),
        pointsApi.getLedger({ limit: 25 }),
        fetchLeaderboard()
    ]);

    balance.value = me.points.balance;
    ledger.value = ledgerData.entries;
}

async function fetchLeaderboard() {
    const data = await getLeaderboard({ period: period.value });
    leaderboard.value = data.leaderboard;
}

onMounted(async () => {
    try {
        await households.fetchMembers();
        await fetchAll();
    } catch (err) {
        error.value = err.message;
    }
});

async function changePeriod() {
    error.value = "";

    try {
        await fetchLeaderboard();
    } catch (err) {
        error.value = err.message;
    }
}

async function submitAdjust() {
    error.value = "";
    info.value = "";

    try {
        const { adjustment } = await pointsApi.adjustPoints({
            memberId: Number(adjustForm.memberId),
            amount: Number(adjustForm.amount),
            note: adjustForm.note || null
        });

        info.value = `Justerade ${adjustment.amount} p — nytt saldo: ${adjustment.balance} p.`;
        adjustForm.note = "";

        await fetchAll();
        await households.fetchMembers(true);
    } catch (err) {
        error.value = err.message;
    }
}

function formatAmount(amount) {
    return amount > 0 ? `+${amount}` : `${amount}`;
}

// Visa aktören när den tillför information: alltid för justeringar,
// annars bara när någon annan än mottagaren orsakade raden (t.ex.
// managern som godkände sysslan).
function showActor(entry) {
    if (!entry.createdByDisplayName) {
        return false;
    }

    return (
        entry.reason === "manual_adjustment" ||
        entry.createdByMemberId !== entry.memberId
    );
}
</script>

<template>
    <div class="page">
        <div class="page-head">
            <h1>Poäng</h1>
            <span v-if="balance !== null" class="balance-chip">{{ balance }} p</span>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="info" class="muted">{{ info }}</p>

        <div class="points-columns">
            <section class="card points-section">
                <div class="section-head">
                    <h2>Topplista</h2>
                    <select v-model="period" class="period-select" @change="changePeriod">
                        <option v-for="opt in PeriodOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </div>

                <ol v-if="leaderboard?.entries?.length" class="board-list">
                    <li v-for="entry in leaderboard.entries" :key="entry.memberId">
                        <span class="rank">{{ entry.rank }}</span>
                        <strong class="board-name">{{ entry.displayName }}</strong>
                        <span class="muted">{{ entry.completedChores }} sysslor</span>
                        <span class="badge">{{ entry.earned }} p</span>
                    </li>
                </ol>
                <p v-else class="muted">Ingen data ännu.</p>
            </section>

            <section class="card points-section">
                <h2>Historik</h2>

                <ul v-if="ledger.length" class="ledger-list">
                    <li v-for="entry in ledger" :key="entry.id">
                        <div>
                            <strong>{{ entry.choreTitle || entry.note || ReasonLabels[entry.reason] }}</strong>
                            <div class="muted ledger-meta">
                                {{ entry.memberDisplayName }} · {{ ReasonLabels[entry.reason] }}
                                <template v-if="showActor(entry)">
                                    · av {{ entry.createdByDisplayName }}
                                </template>
                                <template v-if="entry.note && entry.choreTitle">
                                    · {{ entry.note }}
                                </template>
                            </div>
                        </div>
                        <span
                            class="amount"
                            :class="entry.amount > 0 ? 'positive' : 'negative'"
                        >
                            {{ formatAmount(entry.amount) }} p
                        </span>
                    </li>
                </ul>
                <p v-else class="muted">Ingen historik ännu.</p>
            </section>
        </div>

        <form
            v-if="households.isManager"
            class="card adjust-form"
            @submit.prevent="submitAdjust"
        >
            <h2>Justera poäng</h2>

            <div class="adjust-fields">
                <label class="field">
                    <span>Medlem</span>
                    <select v-model="adjustForm.memberId" required>
                        <option value="" disabled>Välj medlem</option>
                        <option
                            v-for="member in households.members"
                            :key="member.id"
                            :value="member.id"
                        >
                            {{ member.displayName }} ({{ member.pointsBalance }} p)
                        </option>
                    </select>
                </label>

                <label class="field">
                    <span>Belopp (+/-)</span>
                    <input v-model="adjustForm.amount" type="number" required />
                </label>

                <label class="field note-field">
                    <span>Anteckning</span>
                    <input v-model="adjustForm.note" type="text" placeholder="t.ex. Veckopeng" />
                </label>

                <button class="btn btn-primary" type="submit">Justera</button>
            </div>
        </form>
    </div>
</template>

<style scoped>
.page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.balance-chip {
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    background: var(--color-primary);
    color: #fff;
    font-weight: 700;
}

.points-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.points-section {
    padding: 1.25rem;
}

.points-section h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
}

.section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
}

.section-head h2 {
    margin: 0;
}

.period-select,
.field select {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.9rem;
}

.board-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.board-list li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}

.rank {
    width: 1.6rem;
    height: 1.6rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--color-surface-alt);
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
}

.board-name {
    flex: 1;
}

.ledger-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.ledger-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.ledger-meta {
    font-size: 0.85rem;
}

.amount {
    font-weight: 700;
    flex-shrink: 0;
}

.amount.positive {
    color: #15803d;
}

.amount.negative {
    color: var(--color-danger);
}

.adjust-form {
    padding: 1.25rem;
}

.adjust-form h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
}

.adjust-fields {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
}

.note-field {
    flex: 1;
    min-width: 180px;
}
</style>

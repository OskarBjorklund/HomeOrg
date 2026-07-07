<script setup>
import { computed, onMounted, ref, watch } from "vue";
import dayjs from "dayjs";
import * as calendarApi from "../api";
import * as instancesApi from "../../choreInstances/api";
import * as permissions from "../../choreInstances/permissions";
import { StatusLabels } from "../../choreInstances/constants";
import { useHouseholdsStore } from "../../households/store";

const DATE_FORMAT = "YYYY-MM-DD";
const WEEKDAYS = ["Mån", "Tis", "Ons", "Tors", "Fre", "Lör", "Sön"];
const MAX_CHIPS = 3;

const households = useHouseholdsStore();

const currentMonth = ref(dayjs().startOf("month"));
const dayMap = ref(new Map());
const selectedDate = ref(dayjs().format(DATE_FORMAT));
const loading = ref(false);
const error = ref("");

const today = dayjs().format(DATE_FORMAT);

// Rutnätet börjar på måndagen i veckan där månaden startar (6 veckor = 42 dagar).
const gridStart = computed(() => {
    const first = currentMonth.value;

    return first.subtract((first.day() + 6) % 7, "day");
});

const gridDays = computed(() =>
    Array.from({ length: 42 }, (_, index) => {
        const date = gridStart.value.add(index, "day");
        const key = date.format(DATE_FORMAT);

        return {
            key,
            dayNumber: date.date(),
            inMonth: date.month() === currentMonth.value.month(),
            isToday: key === today,
            items: dayMap.value.get(key) || []
        };
    })
);

const monthLabel = computed(() => {
    const label = currentMonth.value.format("MMMM YYYY");

    return label.charAt(0).toUpperCase() + label.slice(1);
});

const selectedItems = computed(() => dayMap.value.get(selectedDate.value) || []);

const permissionContext = computed(() => ({
    myMemberId: households.myMember?.id ?? null,
    isManager: households.isManager
}));

async function fetchCalendar() {
    loading.value = true;
    error.value = "";

    try {
        const from = gridStart.value.format(DATE_FORMAT);
        const to = gridStart.value.add(41, "day").format(DATE_FORMAT);

        const { calendar } = await calendarApi.getCalendar({ from, to });

        dayMap.value = new Map(calendar.days.map((day) => [day.date, day.items]));
    } catch (err) {
        error.value = err.message;
    } finally {
        loading.value = false;
    }
}

watch(currentMonth, fetchCalendar);

onMounted(async () => {
    try {
        await households.fetchMembers();
    } catch (err) {
        error.value = err.message;
    }

    await fetchCalendar();
});

function previousMonth() {
    currentMonth.value = currentMonth.value.subtract(1, "month");
}

function nextMonth() {
    currentMonth.value = currentMonth.value.add(1, "month");
}

function goToToday() {
    currentMonth.value = dayjs().startOf("month");
    selectedDate.value = today;
}

function selectDay(day) {
    selectedDate.value = day.key;
}

function memberName(memberId) {
    return households.membersById.get(memberId)?.displayName || "Okänd";
}

function chipClass(item) {
    if (item.type === "projection") {
        return "chip-projection";
    }

    return `chip-${item.status}`;
}

// Alla åtgärder hämtar om kalendern — instanser kan flytta mellan
// dagar/statusar och projektioner ersätts av riktiga instanser.
async function run(action) {
    error.value = "";

    try {
        await action();
        await fetchCalendar();
    } catch (err) {
        error.value = err.message;
    }
}

const materialize = (item) =>
    run(() => calendarApi.materialize({ choreId: item.choreId, dueDate: item.dueDate }));

const claim = (item) => run(() => instancesApi.claimInstance(item.id));
const unclaim = (item) => run(() => instancesApi.unclaimInstance(item.id));
const complete = (item) => run(() => instancesApi.completeInstance(item.id));
const approve = (item) => run(() => instancesApi.approveInstance(item.id));

function reject(item) {
    const reason = window.prompt("Anledning till avvisning (valfritt):") ?? null;

    if (reason === null) {
        return;
    }

    return run(() => instancesApi.rejectInstance(item.id, reason.trim() || null));
}

const canClaim = (item) => permissions.canClaim(item);
const canUnclaim = (item) => permissions.canUnclaim(item, permissionContext.value);
const canComplete = (item) => permissions.canComplete(item, permissionContext.value);
const canApprove = (item) => permissions.canApprove(item, permissionContext.value);
</script>

<template>
    <div class="page calendar-page">
        <div class="page-head">
            <h1>Kalender</h1>

            <div class="month-nav">
                <button class="btn btn-ghost" @click="previousMonth">◀</button>
                <strong class="month-label">{{ monthLabel }}</strong>
                <button class="btn btn-ghost" @click="nextMonth">▶</button>
                <button class="btn btn-ghost" @click="goToToday">Idag</button>
            </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="card calendar-grid" :class="{ loading }">
            <div v-for="weekday in WEEKDAYS" :key="weekday" class="weekday-head">
                {{ weekday }}
            </div>

            <button
                v-for="day in gridDays"
                :key="day.key"
                class="day-cell"
                :class="{
                    outside: !day.inMonth,
                    today: day.isToday,
                    selected: day.key === selectedDate
                }"
                @click="selectDay(day)"
            >
                <span class="day-number">{{ day.dayNumber }}</span>

                <span
                    v-for="item in day.items.slice(0, MAX_CHIPS)"
                    :key="item.type + (item.id || item.choreId + item.dueDate)"
                    class="chip"
                    :class="chipClass(item)"
                >
                    {{ item.title }}
                </span>

                <span v-if="day.items.length > MAX_CHIPS" class="chip chip-more">
                    +{{ day.items.length - MAX_CHIPS }} till
                </span>
            </button>
        </div>

        <section class="card day-panel">
            <h2>{{ selectedDate }}</h2>

            <ul v-if="selectedItems.length" class="day-items">
                <li v-for="item in selectedItems" :key="item.type + (item.id || item.choreId)">
                    <div class="day-item-info">
                        <div>
                            <strong>{{ item.title }}</strong>
                            <span class="badge">{{ item.points }} p</span>

                            <span v-if="item.type === 'projection'" class="badge chip-projection">
                                Planerad (återkommande)
                            </span>
                            <span v-else class="badge" :class="`chip-${item.status}`">
                                {{ StatusLabels[item.status] }}
                            </span>
                        </div>

                        <div v-if="item.type === 'instance'" class="muted day-item-meta">
                            <span v-if="item.assignedToMemberId">
                                Tilldelad: {{ memberName(item.assignedToMemberId) }}
                            </span>
                            <span v-else-if="item.claimedByMemberId">
                                Tagen av: {{ memberName(item.claimedByMemberId) }}
                            </span>
                            <span v-if="item.completedByMemberId">
                                · Utförd av: {{ memberName(item.completedByMemberId) }}
                            </span>
                        </div>
                    </div>

                    <div class="day-item-actions">
                        <button
                            v-if="item.type === 'projection'"
                            class="btn btn-primary"
                            @click="materialize(item)"
                        >
                            Lägg till
                        </button>

                        <template v-else>
                            <button v-if="canClaim(item)" class="btn btn-ghost" @click="claim(item)">
                                Ta
                            </button>
                            <button v-if="canUnclaim(item)" class="btn btn-ghost" @click="unclaim(item)">
                                Släpp
                            </button>
                            <button v-if="canComplete(item)" class="btn btn-primary" @click="complete(item)">
                                Klar
                            </button>
                            <template v-if="canApprove(item)">
                                <button class="btn btn-primary" @click="approve(item)">Godkänn</button>
                                <button class="btn btn-ghost" @click="reject(item)">Avvisa</button>
                            </template>
                        </template>
                    </div>
                </li>
            </ul>

            <p v-else class="muted">Inget planerat den här dagen.</p>
        </section>
    </div>
</template>

<style scoped>
.calendar-page {
    max-width: 1080px;
}

.page-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.month-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.month-label {
    min-width: 10rem;
    text-align: center;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    padding: 1px;
    overflow: hidden;
    margin-bottom: 1.5rem;
    background: var(--color-border);
}

.calendar-grid.loading {
    opacity: 0.6;
}

.weekday-head {
    background: var(--color-surface-alt);
    padding: 0.4rem;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
}

.day-cell {
    background: var(--color-surface);
    border: none;
    min-height: 92px;
    padding: 0.3rem;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    cursor: pointer;
    font: inherit;
    color: inherit;
    text-align: left;
}

.day-cell.outside {
    opacity: 0.45;
}

.day-cell.today .day-number {
    background: var(--color-primary);
    color: #fff;
}

.day-cell.selected {
    outline: 2px solid var(--color-primary);
    outline-offset: -2px;
}

.day-number {
    align-self: flex-start;
    width: 1.5rem;
    height: 1.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 600;
}

.chip {
    font-size: 0.7rem;
    padding: 0.1rem 0.3rem;
    border-radius: 4px;
    background: var(--color-surface-alt);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chip-projection {
    background: transparent;
    border: 1px dashed var(--color-border);
    color: var(--color-text-muted);
}

.chip-approved {
    background: #dcfce7;
    color: #15803d;
}

.chip-completed {
    background: #fef3c7;
    color: #b45309;
}

.chip-rejected {
    background: #fee2e2;
    color: #b91c1c;
}

.chip-claimed {
    background: #dbeafe;
    color: #1d4ed8;
}

.chip-more {
    background: transparent;
    color: var(--color-text-muted);
}

.day-panel {
    padding: 1.25rem;
}

.day-panel h2 {
    margin: 0 0 0.75rem;
    font-size: 1.1rem;
}

.day-items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.day-items li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.day-item-meta {
    font-size: 0.85rem;
    margin-top: 0.2rem;
}

.day-item-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
}

.day-items .badge {
    margin-left: 0.5rem;
}
</style>

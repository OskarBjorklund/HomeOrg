<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import dayjs from "dayjs";
import * as householdsApi from "../api";
import { useHouseholdsStore } from "../store";
import { useAuthStore } from "../../auth/store";
import { RoleLabels, RoleRank, assignableRoles } from "../constants";

const router = useRouter();
const store = useHouseholdsStore();
const auth = useAuthStore();

const settings = reactive({
    pointsEnabled: true,
    shopEnabled: true,
    choresNeedApproval: false,
    childrenCanBuyRewards: false,
    weekStartsOn: 1,
    timezone: "Europe/Stockholm",
    defaultCurrency: "SEK"
});

const invites = ref([]);
const inviteRole = ref("member");
const error = ref("");
const info = ref("");

const WeekdayOptions = [
    { value: 1, label: "Måndag" },
    { value: 2, label: "Tisdag" },
    { value: 3, label: "Onsdag" },
    { value: 4, label: "Torsdag" },
    { value: 5, label: "Fredag" },
    { value: 6, label: "Lördag" },
    { value: 0, label: "Söndag" }
];

const householdName = computed(
    () =>
        store.households.find((h) => h.id === auth.user?.householdId)?.name ||
        "Aktivt hushåll"
);

const isOwner = computed(() => store.myMember?.role === "owner");

// Roller jag får tilldela (lägre rang än min egen, aldrig owner).
const roleOptions = computed(() =>
    assignableRoles(store.myMember?.role).map((role) => ({
        value: role,
        label: RoleLabels[role]
    }))
);

// Backend-regeln speglad: admin + lägre rang än min egen + inte jag själv.
function canManage(target) {
    return (
        store.isAdmin &&
        target.id !== store.myMember?.id &&
        RoleRank[store.myMember?.role] > RoleRank[target.role]
    );
}

function inviteStatus(invite) {
    if (invite.usedAt) {
        return "Använd";
    }

    if (invite.expiresAt && dayjs(invite.expiresAt).isBefore(dayjs())) {
        return "Utgången";
    }

    return "Aktiv";
}

function formatDate(value) {
    return dayjs(value).format("D MMM YYYY");
}

async function fetchInvites() {
    const data = await householdsApi.getInvites();
    invites.value = data.invites;
}

async function fetchSettings() {
    const data = await householdsApi.getSettings();

    // DB lagrar booleans som 1/0 — PATCH kräver riktiga booleans.
    settings.pointsEnabled = Boolean(data.settings.pointsEnabled);
    settings.shopEnabled = Boolean(data.settings.shopEnabled);
    settings.choresNeedApproval = Boolean(data.settings.choresNeedApproval);
    settings.childrenCanBuyRewards = Boolean(data.settings.childrenCanBuyRewards);
    settings.weekStartsOn = data.settings.weekStartsOn;
    settings.timezone = data.settings.timezone;
    settings.defaultCurrency = data.settings.defaultCurrency;
}

onMounted(async () => {
    try {
        await Promise.all([store.fetchMembers(true), store.fetchMine(), fetchSettings()]);

        if (store.isAdmin) {
            await fetchInvites();
        }
    } catch (err) {
        error.value = err.message;
    }
});

async function run(action, successMessage = "") {
    error.value = "";
    info.value = "";

    try {
        await action();
        info.value = successMessage;
    } catch (err) {
        error.value = err.message;
    }
}

// ---- Medlemmar ----

function changeRole(member, event) {
    const role = event.target.value;

    return run(async () => {
        await householdsApi.updateMember(member.id, { role });
        await store.fetchMembers(true);
    }, `${member.displayName} är nu ${RoleLabels[role]}.`);
}

function toggleChild(member, event) {
    const isChildAccount = event.target.checked;

    return run(async () => {
        await householdsApi.updateMember(member.id, { isChildAccount });
        await store.fetchMembers(true);
    });
}

function removeMember(member) {
    if (!window.confirm(`Ta bort ${member.displayName} ur hushållet?`)) {
        return;
    }

    return run(async () => {
        await householdsApi.removeMember(member.id);
        await store.fetchMembers(true);
    }, `${member.displayName} har tagits bort.`);
}

function transferOwnership(member) {
    if (
        !window.confirm(
            `Överlåt ägarskapet till ${member.displayName}? Du blir själv admin.`
        )
    ) {
        return;
    }

    return run(async () => {
        await householdsApi.transferOwnership(member.id);
        await store.fetchMembers(true);
    }, `${member.displayName} är nu ägare.`);
}

// ---- Inbjudningar ----

function createInvite() {
    return run(async () => {
        await householdsApi.createInvite({
            householdId: auth.user.householdId,
            role: inviteRole.value
        });
        await fetchInvites();
    }, "Inbjudan skapad — kopiera koden nedan.");
}

async function copyCode(invite) {
    await navigator.clipboard.writeText(invite.inviteCode);
    info.value = `Koden ${invite.inviteCode} kopierad.`;
}

function revokeInvite(invite) {
    return run(async () => {
        await householdsApi.revokeInvite(invite.id);
        await fetchInvites();
    }, "Inbjudan återkallad.");
}

// ---- Inställningar ----

function saveSettings() {
    return run(async () => {
        await householdsApi.updateSettings({ ...settings });
        await fetchSettings();
    }, "Inställningarna sparade.");
}

// ---- Lämna ----

function leaveHousehold() {
    if (!window.confirm("Lämna hushållet? Du behöver en ny inbjudan för att gå med igen.")) {
        return;
    }

    return run(async () => {
        await householdsApi.leave();
        await auth.refresh();
        await router.push({ name: "households" });
    });
}
</script>

<template>
    <div class="page admin-page">
        <div class="page-head">
            <h1>Hantera hushåll</h1>
            <span class="badge">{{ householdName }}</span>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="info" class="muted">{{ info }}</p>

        <section class="card admin-section">
            <h2>Medlemmar</h2>

            <ul class="member-list">
                <li v-for="member in store.members" :key="member.id">
                    <div class="member-info">
                        <strong>{{ member.displayName }}</strong>
                        <span class="badge">{{ RoleLabels[member.role] }}</span>
                        <span v-if="member.isChildAccount" class="badge">Barnkonto</span>
                        <span v-if="member.id === store.myMember?.id" class="muted">(du)</span>
                        <span class="muted balance">{{ member.pointsBalance }} p</span>
                    </div>

                    <div v-if="canManage(member)" class="member-actions">
                        <select
                            class="role-select"
                            :value="member.role"
                            @change="changeRole(member, $event)"
                        >
                            <option
                                v-for="opt in roleOptions"
                                :key="opt.value"
                                :value="opt.value"
                            >
                                {{ opt.label }}
                            </option>
                        </select>

                        <label class="child-toggle">
                            <input
                                type="checkbox"
                                :checked="Boolean(member.isChildAccount)"
                                @change="toggleChild(member, $event)"
                            />
                            Barnkonto
                        </label>

                        <button
                            v-if="isOwner"
                            class="btn btn-ghost"
                            @click="transferOwnership(member)"
                        >
                            Gör till ägare
                        </button>

                        <button class="btn btn-danger" @click="removeMember(member)">
                            Ta bort
                        </button>
                    </div>
                </li>
            </ul>
        </section>

        <section v-if="store.isAdmin" class="card admin-section">
            <h2>Inbjudningar</h2>

            <form class="invite-form" @submit.prevent="createInvite">
                <label class="field">
                    <span>Roll för den inbjudna</span>
                    <select v-model="inviteRole" class="role-select">
                        <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </label>

                <button class="btn btn-primary" type="submit">Skapa inbjudan</button>
            </form>

            <ul v-if="invites.length" class="invite-list">
                <li v-for="invite in invites" :key="invite.id">
                    <code class="invite-code">{{ invite.inviteCode }}</code>
                    <span class="badge">{{ RoleLabels[invite.role] }}</span>
                    <span
                        class="badge"
                        :class="{ 'status-active': inviteStatus(invite) === 'Aktiv' }"
                    >
                        {{ inviteStatus(invite) }}
                    </span>
                    <span v-if="invite.expiresAt" class="muted">
                        Utgår {{ formatDate(invite.expiresAt) }}
                    </span>

                    <span class="invite-actions">
                        <button
                            v-if="inviteStatus(invite) === 'Aktiv'"
                            class="btn btn-ghost"
                            @click="copyCode(invite)"
                        >
                            Kopiera
                        </button>
                        <button
                            v-if="!invite.usedAt"
                            class="btn btn-ghost"
                            @click="revokeInvite(invite)"
                        >
                            Återkalla
                        </button>
                    </span>
                </li>
            </ul>
            <p v-else class="muted">Inga inbjudningar ännu.</p>
        </section>

        <section class="card admin-section">
            <h2>Inställningar</h2>

            <form class="settings-form" @submit.prevent="saveSettings">
                <label class="check-field">
                    <input v-model="settings.pointsEnabled" type="checkbox" :disabled="!store.isAdmin" />
                    Poängsystem aktiverat
                </label>

                <label class="check-field">
                    <input v-model="settings.shopEnabled" type="checkbox" :disabled="!store.isAdmin" />
                    Shop aktiverad
                </label>

                <label class="check-field">
                    <input
                        v-model="settings.choresNeedApproval"
                        type="checkbox"
                        :disabled="!store.isAdmin"
                    />
                    Sysslor kräver godkännande som standard
                </label>

                <label class="check-field">
                    <input
                        v-model="settings.childrenCanBuyRewards"
                        type="checkbox"
                        :disabled="!store.isAdmin"
                    />
                    Barn får köpa belöningar
                </label>

                <div class="settings-row">
                    <label class="field">
                        <span>Veckan börjar på</span>
                        <select v-model="settings.weekStartsOn" :disabled="!store.isAdmin">
                            <option v-for="opt in WeekdayOptions" :key="opt.value" :value="opt.value">
                                {{ opt.label }}
                            </option>
                        </select>
                    </label>

                    <label class="field">
                        <span>Tidszon</span>
                        <input v-model="settings.timezone" type="text" :disabled="!store.isAdmin" />
                    </label>

                    <label class="field">
                        <span>Valuta</span>
                        <input
                            v-model="settings.defaultCurrency"
                            type="text"
                            maxlength="3"
                            :disabled="!store.isAdmin"
                        />
                    </label>
                </div>

                <button v-if="store.isAdmin" class="btn btn-primary" type="submit">
                    Spara inställningar
                </button>
            </form>
        </section>

        <section class="card admin-section">
            <h2>Lämna hushållet</h2>

            <p v-if="isOwner" class="muted">
                Som ägare måste du först överlåta ägarskapet till någon annan innan du
                kan lämna.
            </p>

            <button v-else class="btn btn-danger" @click="leaveHousehold">
                Lämna hushållet
            </button>
        </section>
    </div>
</template>

<style scoped>
.admin-page {
    max-width: 860px;
}

.page-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.admin-section {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
}

.admin-section h2 {
    margin: 0 0 0.9rem;
    font-size: 1.1rem;
}

.member-list,
.invite-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.member-list li,
.invite-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
}

.member-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.balance {
    font-size: 0.85rem;
}

.member-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.role-select {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    font: inherit;
}

.child-toggle,
.check-field {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
}

.btn-danger {
    background: #fee2e2;
    color: #b91c1c;
    border: 1px solid #fecaca;
}

.invite-form {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.invite-code {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    background: var(--color-surface-alt);
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
}

.invite-actions {
    display: flex;
    gap: 0.4rem;
    margin-left: auto;
}

.status-active {
    background: #dcfce7;
    color: #15803d;
}

.settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.settings-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;
    margin: 0.5rem 0;
}

.settings-form .btn {
    align-self: flex-start;
    margin-top: 0.25rem;
}
</style>

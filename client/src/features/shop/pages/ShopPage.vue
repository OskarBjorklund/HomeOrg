<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useShopStore } from "../store";
import { useHouseholdsStore } from "../../households/store";
import { getMyPoints } from "../../points/api";
import { UsesModeOptions, usesLabel } from "../constants";

const store = useShopStore();
const households = useHouseholdsStore();

const balance = ref(null);
const error = ref("");
const info = ref("");
const showForm = ref(false);
const showPurchases = ref(false);

function emptyForm() {
    return {
        presetId: "",
        title: "",
        description: "",
        cost: 10,
        usesMode: "single",
        usesCount: 3,
        disappearsAfterPurchase: false,
        visibleToMemberIds: [],
        saveAsPreset: false
    };
}

const form = reactive(emptyForm());

const usingPreset = computed(() => form.presetId !== "");

// När en preset väljs förifylls fälten med dess värden som utgångsläge.
watch(
    () => form.presetId,
    (presetId) => {
        if (!presetId) {
            return;
        }

        const preset = store.presets.find((p) => p.id === Number(presetId));

        if (preset) {
            form.title = preset.title;
            form.description = preset.description || "";
            form.cost = preset.defaultCost;

            if (preset.defaultUsesTotal === null) {
                form.usesMode = "permanent";
            } else if (preset.defaultUsesTotal === 1) {
                form.usesMode = "single";
            } else {
                form.usesMode = "multi";
                form.usesCount = preset.defaultUsesTotal;
            }

            form.saveAsPreset = false;
        }
    }
);

onMounted(async () => {
    try {
        const tasks = [store.fetchItems(), households.fetchMembers(), refreshBalance()];

        if (households.isManager) {
            tasks.push(store.fetchPresets());
        }

        tasks.push(store.fetchPurchases());

        await Promise.all(tasks);

        // isManager avgörs först efter fetchMembers — hämta presets i efterhand.
        if (households.isManager && store.presets.length === 0) {
            await store.fetchPresets();
        }
    } catch (err) {
        error.value = err.message;
    }
});

async function refreshBalance() {
    const { points } = await getMyPoints();
    balance.value = points.balance;
}

async function run(action) {
    error.value = "";
    info.value = "";

    try {
        await action();
    } catch (err) {
        error.value = err.message;
    }
}

function buy(item) {
    return run(async () => {
        const result = await store.buy(item.id);
        balance.value = result.balance;
        info.value = `Köpte "${item.title}" — nytt saldo: ${result.balance} p. Varan finns i Mina saker.`;
    });
}

function usesTotalFromForm() {
    if (form.usesMode === "permanent") {
        return null;
    }

    if (form.usesMode === "single") {
        return 1;
    }

    return Number(form.usesCount);
}

function submitItem() {
    return run(async () => {
        const payload = {
            cost: Number(form.cost),
            usesTotal: usesTotalFromForm(),
            disappearsAfterPurchase: form.disappearsAfterPurchase
        };

        if (form.visibleToMemberIds.length > 0) {
            payload.visibleToMemberIds = form.visibleToMemberIds;
        }

        if (usingPreset.value) {
            payload.presetId = Number(form.presetId);
            payload.title = form.title;
            payload.description = form.description || null;
        } else {
            payload.title = form.title;
            payload.description = form.description || null;
            payload.saveAsPreset = form.saveAsPreset;
        }

        await store.createItem(payload);

        Object.assign(form, emptyForm());
        showForm.value = false;
        info.value = "Varan är upplagd i shoppen.";
    });
}

function removeItem(item) {
    if (!window.confirm(`Avlista "${item.title}"?`)) {
        return;
    }

    return run(() => store.deleteItem(item.id));
}

// Raderar presetet som är valt i formuläret och återgår till "Skapa helt ny".
function removeSelectedPreset() {
    const preset = store.presets.find((p) => p.id === Number(form.presetId));

    if (!preset || !window.confirm(`Ta bort presetet "${preset.title}"?`)) {
        return;
    }

    return run(async () => {
        await store.deletePreset(preset.id);
        Object.assign(form, emptyForm());
        info.value = `Presetet "${preset.title}" är borttaget.`;
    });
}

// En vara med synlighetslista kan bara köpas av dem som står i den —
// det gäller även managern som lade upp den (backend blockerar med 403).
function canBuy(item) {
    if (!item.visibleToMemberIds || item.visibleToMemberIds.length === 0) {
        return true;
    }

    return item.visibleToMemberIds.includes(households.myMember?.id);
}

function visibilityLabel(item) {
    if (!item.visibleToMemberIds || item.visibleToMemberIds.length === 0) {
        return "Alla";
    }

    return item.visibleToMemberIds
        .map((id) => households.membersById.get(id)?.displayName || "?")
        .join(", ");
}
</script>

<template>
    <div class="page">
        <div class="page-head">
            <h1>Shop</h1>

            <div class="page-actions">
                <span v-if="balance !== null" class="balance-chip">{{ balance }} p</span>

                <button
                    v-if="households.isManager"
                    class="btn btn-primary"
                    @click="showForm = !showForm"
                >
                    {{ showForm ? "Stäng" : "Ny vara" }}
                </button>
            </div>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>
        <p v-if="info" class="muted">{{ info }}</p>

        <form v-if="showForm" class="card shop-form" @submit.prevent="submitItem">
            <h2>Ny vara</h2>

            <div class="form-grid">
                <div class="field span-2">
                    <span>Utgå från preset</span>
                    <div class="preset-row">
                        <select v-model="form.presetId">
                            <option value="">Skapa helt ny</option>
                            <option v-for="preset in store.presets" :key="preset.id" :value="preset.id">
                                {{ preset.title }} ({{ preset.defaultCost }} p)
                            </option>
                        </select>

                        <button
                            v-if="usingPreset"
                            class="btn btn-ghost"
                            type="button"
                            @click="removeSelectedPreset"
                        >
                            Radera preset
                        </button>
                    </div>
                </div>

                <label class="field span-2">
                    <span>Titel</span>
                    <input v-model="form.title" type="text" required />
                </label>

                <label class="field span-2">
                    <span>Beskrivning</span>
                    <input v-model="form.description" type="text" />
                </label>

                <label class="field">
                    <span>Pris (poäng)</span>
                    <input v-model="form.cost" type="number" min="0" required />
                </label>

                <label class="field">
                    <span>Användningar</span>
                    <select v-model="form.usesMode">
                        <option v-for="opt in UsesModeOptions" :key="opt.value" :value="opt.value">
                            {{ opt.label }}
                        </option>
                    </select>
                </label>

                <label v-if="form.usesMode === 'multi'" class="field">
                    <span>Antal användningar</span>
                    <input v-model="form.usesCount" type="number" min="2" required />
                </label>

                <div class="field span-2">
                    <span>Synlig för (ingen vald = alla)</span>
                    <div class="member-picker">
                        <label
                            v-for="member in households.members"
                            :key="member.id"
                            class="checkbox"
                        >
                            <input
                                v-model="form.visibleToMemberIds"
                                type="checkbox"
                                :value="member.id"
                            />
                            {{ member.displayName }}
                        </label>
                    </div>
                </div>

                <label class="checkbox">
                    <input v-model="form.disappearsAfterPurchase" type="checkbox" />
                    Försvinner efter köp
                </label>

                <label v-if="!usingPreset" class="checkbox">
                    <input v-model="form.saveAsPreset" type="checkbox" />
                    Spara som preset
                </label>
            </div>

            <div class="form-buttons">
                <button class="btn btn-primary" type="submit">Lägg upp</button>
                <button
                    class="btn btn-ghost"
                    type="button"
                    @click="Object.assign(form, emptyForm()); showForm = false"
                >
                    Avbryt
                </button>
            </div>
        </form>

        <div v-if="store.loading" class="muted">Laddar...</div>

        <div v-else-if="store.items.length" class="item-grid">
            <div v-for="item in store.items" :key="item.id" class="card shop-item">
                <div class="shop-item-body">
                    <strong>{{ item.title }}</strong>
                    <p v-if="item.description" class="muted item-desc">{{ item.description }}</p>

                    <div class="item-badges">
                        <span class="badge cost-badge">{{ item.cost }} p</span>
                        <span class="badge">{{ usesLabel(item.usesTotal) }}</span>
                        <span v-if="item.disappearsAfterPurchase === 1" class="badge">
                            Försvinner efter köp
                        </span>
                        <span v-if="households.isManager" class="badge">
                            Synlig: {{ visibilityLabel(item) }}
                        </span>
                    </div>
                </div>

                <div class="shop-item-actions">
                    <button
                        v-if="canBuy(item)"
                        class="btn btn-primary"
                        :disabled="balance !== null && balance < item.cost"
                        @click="buy(item)"
                    >
                        Köp
                    </button>
                    <span v-else class="muted">Endast för andra medlemmar</span>
                    <button
                        v-if="households.isManager"
                        class="btn btn-ghost"
                        @click="removeItem(item)"
                    >
                        Avlista
                    </button>
                </div>
            </div>
        </div>

        <p v-else class="muted">Shoppen är tom.</p>

        <div class="card section-card">
            <button class="section-toggle" @click="showPurchases = !showPurchases">
                Köphistorik {{ showPurchases ? "▾" : "▸" }}
            </button>

            <ul v-if="showPurchases && store.purchases.length" class="row-list">
                <li v-for="purchase in store.purchases" :key="purchase.id">
                    <span>
                        <strong>{{ purchase.itemTitle }}</strong>
                        <span class="muted"> — {{ purchase.buyerDisplayName }}</span>
                        <span class="badge">{{ purchase.cost }} p</span>
                    </span>
                    <span class="muted">{{ purchase.createdAt }}</span>
                </li>
            </ul>
            <p v-else-if="showPurchases" class="muted">Inga köp ännu.</p>
        </div>
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

.balance-chip {
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    background: var(--color-primary);
    color: #fff;
    font-weight: 700;
}

.shop-form,
.section-card {
    padding: 1.25rem;
    margin-bottom: 1.5rem;
}

.shop-form h2,
.section-card h2 {
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

.preset-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.preset-row select {
    flex: 1;
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

.item-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.shop-item {
    padding: 1.1rem 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.75rem;
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

.cost-badge {
    background: var(--color-primary);
    color: #fff;
}

.shop-item-actions {
    display: flex;
    gap: 0.5rem;
}

.row-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.row-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.section-toggle {
    background: none;
    border: none;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    cursor: pointer;
    padding: 0;
    margin-bottom: 0.5rem;
}
</style>

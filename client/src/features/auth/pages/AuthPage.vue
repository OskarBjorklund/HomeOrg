<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../store";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const isRegister = computed(() => route.name === "register");

const form = reactive({
    username: "",
    password: "",
    displayName: ""
});

const error = ref("");

// Rensa fel när man byter mellan login/register.
watch(isRegister, () => {
    error.value = "";
});

async function submit() {
    error.value = "";

    try {
        if (isRegister.value) {
            await auth.register({
                username: form.username,
                password: form.password,
                displayName: form.displayName
            });
        } else {
            await auth.login({
                username: form.username,
                password: form.password
            });
        }

        const redirect = route.query.redirect;
        await router.push(typeof redirect === "string" ? redirect : { name: "home" });
    } catch (err) {
        error.value = err.message;
    }
}
</script>

<template>
    <div class="auth-page">
        <div class="auth-card card">
            <h1 class="auth-brand">HomeOrg</h1>
            <p class="auth-tagline">Ditt hems operativsystem</p>

            <div class="auth-tabs">
                <RouterLink
                    :to="{ name: 'login' }"
                    class="auth-tab"
                    :class="{ active: !isRegister }"
                >
                    Logga in
                </RouterLink>
                <RouterLink
                    :to="{ name: 'register' }"
                    class="auth-tab"
                    :class="{ active: isRegister }"
                >
                    Skapa konto
                </RouterLink>
            </div>

            <form class="auth-form" @submit.prevent="submit">
                <label class="field">
                    <span>Användarnamn</span>
                    <input
                        v-model="form.username"
                        type="text"
                        autocomplete="username"
                        required
                    />
                </label>

                <label v-if="isRegister" class="field">
                    <span>Visningsnamn</span>
                    <input
                        v-model="form.displayName"
                        type="text"
                        autocomplete="name"
                        required
                    />
                </label>

                <label class="field">
                    <span>Lösenord</span>
                    <input
                        v-model="form.password"
                        type="password"
                        :autocomplete="isRegister ? 'new-password' : 'current-password'"
                        required
                    />
                </label>

                <p v-if="error" class="form-error">{{ error }}</p>

                <button class="btn btn-primary" type="submit" :disabled="auth.loading">
                    {{ auth.loading ? "Vänta..." : isRegister ? "Skapa konto" : "Logga in" }}
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.auth-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.auth-card {
    width: 100%;
    max-width: 380px;
    padding: 2rem;
}

.auth-brand {
    margin: 0;
    text-align: center;
    font-size: 1.75rem;
    color: var(--color-primary);
}

.auth-tagline {
    margin: 0.25rem 0 1.5rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.9rem;
}

.auth-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.auth-tab {
    flex: 1;
    text-align: center;
    padding: 0.5rem;
    border-radius: var(--radius);
    background: var(--color-surface-alt);
    color: var(--color-text-muted);
    text-decoration: none;
    font-weight: 500;
}

.auth-tab.active {
    background: var(--color-primary);
    color: #fff;
}

.auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
</style>

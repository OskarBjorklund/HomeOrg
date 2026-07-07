<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../features/auth/store";

const router = useRouter();
const auth = useAuthStore();

async function logout() {
    await auth.logout();
    await router.push({ name: "login" });
}
</script>

<template>
    <div class="app">
        <header v-if="auth.isAuthenticated" class="app-header">
            <RouterLink :to="{ name: 'home' }" class="app-brand">HomeOrg</RouterLink>

            <nav class="app-nav">
                <RouterLink :to="{ name: 'home' }">Översikt</RouterLink>
                <RouterLink :to="{ name: 'todo' }">Att göra</RouterLink>
                <RouterLink :to="{ name: 'calendar' }">Kalender</RouterLink>
                <RouterLink :to="{ name: 'chores' }">Sysslor</RouterLink>
                <RouterLink :to="{ name: 'shop' }">Shop</RouterLink>
                <RouterLink :to="{ name: 'inventory' }">Mina saker</RouterLink>
                <RouterLink :to="{ name: 'points' }">Poäng</RouterLink>
                <RouterLink :to="{ name: 'households' }">Hushåll</RouterLink>
            </nav>

            <div class="app-user">
                <span class="muted">{{ auth.user.displayName }}</span>
                <button class="btn btn-ghost" @click="logout">Logga ut</button>
            </div>
        </header>

        <main>
            <RouterView />
        </main>
    </div>
</template>

<style scoped>
.app-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
}

.app-brand {
    font-weight: 700;
    font-size: 1.2rem;
    color: var(--color-primary);
    text-decoration: none;
}

.app-nav {
    display: flex;
    gap: 1rem;
    flex: 1;
}

.app-nav a {
    color: var(--color-text-muted);
    text-decoration: none;
    font-weight: 500;
}

.app-nav a.router-link-active {
    color: var(--color-primary);
}

.app-user {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}
</style>

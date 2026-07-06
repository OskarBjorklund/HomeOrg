const AuthPage = () => import("./pages/AuthPage.vue");

export default [
    {
        path: "/login",
        name: "login",
        component: AuthPage,
        meta: { requiresGuest: true }
    },
    {
        path: "/register",
        name: "register",
        component: AuthPage,
        meta: { requiresGuest: true }
    }
];

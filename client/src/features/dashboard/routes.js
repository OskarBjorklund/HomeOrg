const DashboardPage = () => import("./pages/DashboardPage.vue");

export default [
    {
        path: "/",
        name: "home",
        component: DashboardPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

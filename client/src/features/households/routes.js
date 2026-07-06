const HouseholdsPage = () => import("./pages/HouseholdsPage.vue");

export default [
    {
        path: "/households",
        name: "households",
        component: HouseholdsPage,
        meta: { requiresAuth: true }
    }
];

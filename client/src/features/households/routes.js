const HouseholdsPage = () => import("./pages/HouseholdsPage.vue");
const HouseholdAdminPage = () => import("./pages/HouseholdAdminPage.vue");

export default [
    {
        path: "/households",
        name: "households",
        component: HouseholdsPage,
        meta: { requiresAuth: true }
    },
    {
        path: "/households/manage",
        name: "household-admin",
        component: HouseholdAdminPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

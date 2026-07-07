const AchievementsPage = () => import("./pages/AchievementsPage.vue");

export default [
    {
        path: "/achievements",
        name: "achievements",
        component: AchievementsPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

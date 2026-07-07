const ChoresPage = () => import("./pages/ChoresPage.vue");

export default [
    {
        path: "/chores",
        name: "chores",
        component: ChoresPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

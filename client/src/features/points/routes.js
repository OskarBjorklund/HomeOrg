const PointsPage = () => import("./pages/PointsPage.vue");

export default [
    {
        path: "/points",
        name: "points",
        component: PointsPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

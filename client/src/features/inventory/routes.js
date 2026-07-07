const InventoryPage = () => import("./pages/InventoryPage.vue");

export default [
    {
        path: "/inventory",
        name: "inventory",
        component: InventoryPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

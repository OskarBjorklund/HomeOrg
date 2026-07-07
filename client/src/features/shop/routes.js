const ShopPage = () => import("./pages/ShopPage.vue");

export default [
    {
        path: "/shop",
        name: "shop",
        component: ShopPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

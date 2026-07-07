const TodoPage = () => import("./pages/TodoPage.vue");

export default [
    {
        path: "/todo",
        name: "todo",
        component: TodoPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

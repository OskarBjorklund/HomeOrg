const CalendarPage = () => import("./pages/CalendarPage.vue");

export default [
    {
        path: "/calendar",
        name: "calendar",
        component: CalendarPage,
        meta: { requiresAuth: true, requiresHousehold: true }
    }
];

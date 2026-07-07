import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../../features/auth/store";
import authRoutes from "../../features/auth/routes";
import householdRoutes from "../../features/households/routes";
import dashboardRoutes from "../../features/dashboard/routes";
import choreRoutes from "../../features/chores/routes";
import choreInstanceRoutes from "../../features/choreInstances/routes";
import shopRoutes from "../../features/shop/routes";
import inventoryRoutes from "../../features/inventory/routes";
import pointsRoutes from "../../features/points/routes";
import calendarRoutes from "../../features/calendar/routes";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        ...authRoutes,
        ...householdRoutes,
        ...dashboardRoutes,
        ...choreRoutes,
        ...choreInstanceRoutes,
        ...shopRoutes,
        ...inventoryRoutes,
        ...pointsRoutes,
        ...calendarRoutes,
        {
            path: "/:pathMatch(.*)*",
            redirect: { name: "home" }
        }
    ]
});

// Guard-kedjan speglar backend-middlewaren:
//   requiresAuth      ~ requireAuth      (inloggad?)
//   requiresHousehold ~ requireHousehold (aktivt hushåll valt?)
//   requiresGuest     — login/register göms för inloggade.
router.beforeEach(async (to) => {
    const auth = useAuthStore();

    // Hämtar /me en gång per sidladdning så att guards har färskt läge.
    await auth.initialize();

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
        return { name: "login", query: { redirect: to.fullPath } };
    }

    if (to.meta.requiresGuest && auth.isAuthenticated) {
        return { name: "home" };
    }

    if (to.meta.requiresHousehold && !auth.hasHousehold) {
        return { name: "households" };
    }

    return true;
});

export default router;

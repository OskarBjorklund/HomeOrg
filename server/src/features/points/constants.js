const { Roles } = require("../households/constants");

const LedgerReason = {
    CHORE_APPROVED: "chore_approved",
    CHORE_UNDONE: "chore_undone",
    CHORE_BUYOUT: "chore_buyout",
    MANUAL_ADJUSTMENT: "manual_adjustment",
    SHOP_PURCHASE: "shop_purchase"
};

// Roller som får göra manuella poängjusteringar.
const PointsManagerRoles = [Roles.OWNER, Roles.ADMIN, Roles.ADULT];

const Limits = {
    ADJUST_MAX: 100000,
    NOTE_MAX: 200,
    LEDGER_PAGE_DEFAULT: 50,
    LEDGER_PAGE_MAX: 100,
    RECENT_ENTRIES: 10
};

module.exports = {
    LedgerReason,
    PointsManagerRoles,
    Limits
};

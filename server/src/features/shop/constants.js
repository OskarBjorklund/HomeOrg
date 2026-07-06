const { Roles } = require("../households/constants");

// Roller som får hantera shoppen (presets, listningar, se alla köp).
const ShopManagerRoles = [Roles.OWNER, Roles.ADMIN, Roles.ADULT];

const PurchaseStatus = {
    COMPLETED: "completed"
};

const Limits = {
    TITLE_MAX: 120,
    DESCRIPTION_MAX: 2000,
    ICON_MAX: 50,
    COLOR_MAX: 30,
    COST_MAX: 100000,

    // uses_total: 1 = engångs, N = flergångs, null = permanent.
    USES_MAX: 1000
};

module.exports = {
    ShopManagerRoles,
    PurchaseStatus,
    Limits
};

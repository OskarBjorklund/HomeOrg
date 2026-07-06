const { Roles } = require("../households/constants");

const InventoryStatus = {
    ACTIVE: "active",
    USED_UP: "used_up"
};

// Roller som får se andra medlemmars inventory.
const InventoryManagerRoles = [Roles.OWNER, Roles.ADMIN, Roles.ADULT];

module.exports = {
    InventoryStatus,
    InventoryManagerRoles
};

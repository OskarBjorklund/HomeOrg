const model = require("./model");
const validation = require("./validation");
const choresModel = require("../chores/model");
const ApiError = require("../../errors/ApiError");
const { InventoryStatus, InventoryManagerRoles } = require("./constants");

function isManager(member) {
    return InventoryManagerRoles.includes(member.role);
}

// Eget inventory som default. Managers kan titta på en annan medlems
// inventory via ?memberId= (t.ex. förälder som kollar barnets belöningar).
async function getInventory(context, query) {
    const { member } = context;

    const { memberId } = validation.validateInventoryQuery(query);

    if (!memberId || memberId === member.id) {
        return model.getInventoryForMember(member.id);
    }

    if (!isManager(member)) {
        throw new ApiError(403, "You can only view your own inventory.");
    }

    const validIds = await choresModel.getMemberIdsForHousehold(member.household_id);

    if (!validIds.includes(memberId)) {
        throw new ApiError(400, "Member is not in this household.");
    }

    return model.getInventoryForMember(memberId);
}

// Aktivering är ägarens handling — inte ens managers kan aktivera åt någon
// annan. Permanenta items (usesTotal null) räknar bara aktiveringar;
// övriga förbrukar en användning och blir used_up på noll.
async function activateItem(context, itemId) {
    const { member } = context;

    const id = validation.validateId(itemId, "inventory item id");
    const item = await model.getInventoryItemById(id);

    if (
        !item ||
        item.householdId !== member.household_id ||
        item.ownerMemberId !== member.id
    ) {
        throw new ApiError(404, "Inventory item not found.");
    }

    if (item.status !== InventoryStatus.ACTIVE) {
        throw new ApiError(400, "This item is used up.");
    }

    if (item.usesTotal === null) {
        return model.recordActivation(id, {
            usesLeft: null,
            status: InventoryStatus.ACTIVE
        });
    }

    const usesLeft = item.usesLeft - 1;

    return model.recordActivation(id, {
        usesLeft,
        status: usesLeft <= 0 ? InventoryStatus.USED_UP : InventoryStatus.ACTIVE
    });
}

module.exports = {
    getInventory,
    activateItem
};

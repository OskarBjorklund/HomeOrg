const model = require("./model");
const validation = require("./validation");
const choresModel = require("../chores/model");
const pointsService = require("../points/service");
const pointsModel = require("../points/model");
const inventoryModel = require("../inventory/model");
const ApiError = require("../../errors/ApiError");
const { withTransaction } = require("../../database/database");
const { LedgerReason } = require("../points/constants");
const { ShopManagerRoles } = require("./constants");

function isManager(member) {
    return ShopManagerRoles.includes(member.role);
}

function requireManager(member) {
    if (!isManager(member)) {
        throw new ApiError(403, "You do not have permission to manage the shop.");
    }
}

async function assertMembersBelongToHousehold(householdId, memberIds) {
    if (!memberIds || memberIds.length === 0) {
        return;
    }

    const validIds = new Set(await choresModel.getMemberIdsForHousehold(householdId));

    for (const memberId of memberIds) {
        if (!validIds.has(memberId)) {
            throw new ApiError(400, "One or more members are not in this household.");
        }
    }
}

async function getOwnedPreset(member, presetId) {
    const preset = await model.getPresetById(presetId);

    if (!preset || preset.householdId !== member.household_id || preset.isActive !== 1) {
        throw new ApiError(404, "Preset not found.");
    }

    return preset;
}

async function getOwnedItem(member, itemId) {
    const item = await model.getItemById(itemId);

    if (!item || item.householdId !== member.household_id || item.isActive !== 1) {
        throw new ApiError(404, "Shop item not found.");
    }

    return item;
}

// ---- Presets ----

async function createPreset(context, body) {
    const { user, member } = context;

    requireManager(member);

    const data = validation.validateCreatePreset(body);

    return model.createPreset({
        householdId: member.household_id,
        createdByUserId: user.id,
        ...data
    });
}

async function getPresets(context) {
    const { member } = context;

    requireManager(member);

    return model.getPresetsForHousehold(member.household_id);
}

async function updatePreset(context, presetId, body) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(presetId, "preset id");
    await getOwnedPreset(member, id);

    const patch = validation.validateUpdatePreset(body);

    return model.updatePreset(id, patch);
}

async function deletePreset(context, presetId) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(presetId, "preset id");
    await getOwnedPreset(member, id);

    await model.deactivatePreset(id);
}

// ---- Listningar ----

async function attachVisibility(items) {
    const visibilityRows = await model.getVisibilityForItems(items.map((item) => item.id));

    const byItem = new Map();

    for (const row of visibilityRows) {
        if (!byItem.has(row.itemId)) {
            byItem.set(row.itemId, []);
        }

        byItem.get(row.itemId).push(row.memberId);
    }

    return items.map((item) => ({
        ...item,
        visibleToMemberIds: byItem.get(item.id) || []
    }));
}

// Tre lägen:
//   1. presetId          — listning från sparad preset (fält kan överridas)
//   2. saveAsPreset=true — ad-hoc listning som samtidigt sparas som preset
//   3. annars            — ren engångslistning
async function createItem(context, body) {
    const { user, member } = context;

    requireManager(member);

    const data = validation.validateCreateItem(body);

    await assertMembersBelongToHousehold(member.household_id, data.visibleToMemberIds);

    let base = {
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
        cost: data.cost,
        usesTotal: data.usesTotal === undefined ? null : data.usesTotal,
        rewardTemplateId: null
    };

    if (data.presetId) {
        const preset = await getOwnedPreset(member, data.presetId);

        base = {
            title: data.title || preset.title,
            description: data.description !== null ? data.description : preset.description,
            icon: data.icon !== null ? data.icon : preset.icon,
            color: data.color !== null ? data.color : preset.color,
            cost: data.cost !== null ? data.cost : preset.defaultCost,
            usesTotal: data.usesTotal === undefined ? preset.defaultUsesTotal : data.usesTotal,
            rewardTemplateId: preset.id
        };
    }

    const item = await withTransaction(async () => {
        if (data.saveAsPreset) {
            const preset = await model.createPreset({
                householdId: member.household_id,
                createdByUserId: user.id,
                title: base.title,
                description: base.description,
                icon: base.icon,
                color: base.color,
                defaultCost: base.cost,
                defaultUsesTotal: base.usesTotal
            });

            base.rewardTemplateId = preset.id;
        }

        const created = await model.createItem({
            householdId: member.household_id,
            createdByUserId: user.id,
            title: base.title,
            description: base.description,
            icon: base.icon,
            color: base.color,
            cost: base.cost,
            usesTotal: base.usesTotal,
            disappearsAfterPurchase: data.disappearsAfterPurchase === true,
            rewardTemplateId: base.rewardTemplateId
        });

        if (data.visibleToMemberIds && data.visibleToMemberIds.length > 0) {
            await model.replaceVisibility(created.id, data.visibleToMemberIds);
        }

        return created;
    });

    const [withVis] = await attachVisibility([item]);

    return withVis;
}

// Managers ser alla aktiva listningar; övriga bara de som är synliga för dem.
async function getItems(context) {
    const { member } = context;

    const items = await model.getItemsForHousehold({
        householdId: member.household_id,
        forMemberId: isManager(member) ? null : member.id
    });

    return attachVisibility(items);
}

async function updateItem(context, itemId, body) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(itemId, "shop item id");
    await getOwnedItem(member, id);

    const { patch, visibleToMemberIds } = validation.validateUpdateItem(body);

    if (visibleToMemberIds !== undefined) {
        await assertMembersBelongToHousehold(member.household_id, visibleToMemberIds);
    }

    const item = await withTransaction(async () => {
        const updated = await model.updateItem(id, patch);

        if (visibleToMemberIds !== undefined) {
            await model.replaceVisibility(id, visibleToMemberIds);
        }

        return updated;
    });

    const [withVis] = await attachVisibility([item]);

    return withVis;
}

async function deleteItem(context, itemId) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(itemId, "shop item id");
    await getOwnedItem(member, id);

    await model.delistItem(id);
}

// ---- Köp ----

// Köpet är atomärt: köp-rad, poängavdrag (via points, enda mutationsstället)
// och inventory-item skapas tillsammans. Om något går fel rullas allt tillbaka.
async function buyItem(context, itemId) {
    const { member } = context;

    const id = validation.validateId(itemId, "shop item id");
    const item = await getOwnedItem(member, id);

    if (!isManager(member)) {
        const visible = await model.isItemVisibleToMember(id, member.id);

        if (!visible) {
            throw new ApiError(404, "Shop item not found.");
        }
    }

    const settings = await model.getShopSettings(member.household_id);

    if (!settings.shopEnabled) {
        throw new ApiError(400, "The shop is disabled for this household.");
    }

    if (!settings.pointsEnabled) {
        throw new ApiError(400, "Points are disabled for this household.");
    }

    if (member.is_child_account && !settings.childrenCanBuyRewards) {
        throw new ApiError(403, "Children cannot buy rewards in this household.");
    }

    return withTransaction(async () => {
        const balance = await pointsModel.getBalanceForMember(member.id);

        if (balance < item.cost) {
            throw new ApiError(400, "Insufficient points.");
        }

        const purchase = await model.createPurchase({
            shopItemId: item.id,
            householdId: member.household_id,
            buyerMemberId: member.id,
            cost: item.cost
        });

        let newBalance = balance;

        if (item.cost > 0) {
            newBalance = await pointsService.addPoints({
                householdId: member.household_id,
                memberId: member.id,
                amount: -item.cost,
                reason: LedgerReason.SHOP_PURCHASE,
                note: item.title,
                shopPurchaseId: purchase.id
            });
        }

        const inventoryItem = await inventoryModel.createInventoryItem({
            householdId: member.household_id,
            ownerMemberId: member.id,
            shopPurchaseId: purchase.id,
            title: item.title,
            description: item.description,
            icon: item.icon,
            color: item.color,
            usesTotal: item.usesTotal,
            usesLeft: item.usesTotal
        });

        if (item.disappearsAfterPurchase === 1) {
            await model.delistItem(item.id);
        }

        return { purchase, inventoryItem, balance: newBalance };
    });
}

// Managers ser hela hushållets köp (valfritt filtrerat på medlem);
// övriga ser bara sina egna.
async function getPurchases(context, query) {
    const { member } = context;

    const { memberId } = validation.validatePurchasesQuery(query);

    if (!isManager(member)) {
        return model.getPurchasesForHousehold({
            householdId: member.household_id,
            memberId: member.id
        });
    }

    return model.getPurchasesForHousehold({
        householdId: member.household_id,
        memberId
    });
}

module.exports = {
    createPreset,
    getPresets,
    updatePreset,
    deletePreset,
    createItem,
    getItems,
    updateItem,
    deleteItem,
    buyItem,
    getPurchases
};

const { getDatabase } = require("../../database/database");
const { PurchaseStatus } = require("./constants");

const PRESET_COLUMNS = `
    id,
    household_id AS householdId,
    title,
    description,
    icon,
    color,
    default_cost AS defaultCost,
    default_uses_total AS defaultUsesTotal,
    created_by_user_id AS createdByUserId,
    is_active AS isActive,
    created_at AS createdAt,
    updated_at AS updatedAt
`;

const ITEM_COLUMNS = `
    shop_items.id,
    shop_items.household_id AS householdId,
    shop_items.title,
    shop_items.description,
    shop_items.icon,
    shop_items.color,
    shop_items.cost,
    shop_items.uses_total AS usesTotal,
    shop_items.disappears_after_purchase AS disappearsAfterPurchase,
    shop_items.reward_template_id AS rewardTemplateId,
    shop_items.created_by_user_id AS createdByUserId,
    shop_items.is_active AS isActive,
    shop_items.created_at AS createdAt,
    shop_items.updated_at AS updatedAt
`;

const PRESET_PATCH_COLUMNS = {
    title: "title",
    description: "description",
    icon: "icon",
    color: "color",
    defaultCost: "default_cost",
    defaultUsesTotal: "default_uses_total"
};

const ITEM_PATCH_COLUMNS = {
    title: "title",
    description: "description",
    icon: "icon",
    color: "color",
    cost: "cost",
    usesTotal: "uses_total",
    disappearsAfterPurchase: "disappears_after_purchase"
};

// ---- Presets (reward_templates) ----

async function createPreset(data) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO reward_templates (
            household_id,
            title,
            description,
            icon,
            color,
            default_cost,
            default_uses_total,
            created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.householdId,
            data.title,
            data.description,
            data.icon,
            data.color,
            data.defaultCost,
            data.defaultUsesTotal,
            data.createdByUserId
        ]
    );

    return getPresetById(result.lastID);
}

async function getPresetById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT ${PRESET_COLUMNS}
         FROM reward_templates
         WHERE id = ?`,
        [id]
    );
}

async function getPresetsForHousehold(householdId) {
    const db = getDatabase();

    return db.all(
        `SELECT ${PRESET_COLUMNS}
         FROM reward_templates
         WHERE household_id = ?
         AND is_active = 1
         ORDER BY created_at DESC`,
        [householdId]
    );
}

async function updatePreset(id, patch) {
    const db = getDatabase();

    const assignments = [];
    const params = [];

    for (const [field, column] of Object.entries(PRESET_PATCH_COLUMNS)) {
        if (patch[field] === undefined) {
            continue;
        }

        assignments.push(`${column} = ?`);
        params.push(patch[field]);
    }

    if (assignments.length > 0) {
        assignments.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);

        await db.run(
            `UPDATE reward_templates
             SET ${assignments.join(", ")}
             WHERE id = ?`,
            params
        );
    }

    return getPresetById(id);
}

async function deactivatePreset(id) {
    const db = getDatabase();

    await db.run(
        `UPDATE reward_templates
         SET is_active = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );
}

// ---- Listningar (shop_items) ----

async function createItem(data) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO shop_items (
            household_id,
            title,
            description,
            icon,
            color,
            cost,
            uses_total,
            disappears_after_purchase,
            reward_template_id,
            created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.householdId,
            data.title,
            data.description,
            data.icon,
            data.color,
            data.cost,
            data.usesTotal,
            data.disappearsAfterPurchase ? 1 : 0,
            data.rewardTemplateId,
            data.createdByUserId
        ]
    );

    return getItemById(result.lastID);
}

async function getItemById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT ${ITEM_COLUMNS}
         FROM shop_items
         WHERE shop_items.id = ?`,
        [id]
    );
}

// forMemberId = null: alla aktiva listningar (managervyn).
// forMemberId satt: endast listningar utan synlighetsbegränsning
// eller där medlemmen uttryckligen ingår.
async function getItemsForHousehold({ householdId, forMemberId }) {
    const db = getDatabase();

    const conditions = ["shop_items.household_id = ?", "shop_items.is_active = 1"];
    const params = [householdId];

    if (forMemberId) {
        conditions.push(`(
            NOT EXISTS (
                SELECT 1 FROM shop_item_visibility
                WHERE shop_item_visibility.shop_item_id = shop_items.id
            )
            OR EXISTS (
                SELECT 1 FROM shop_item_visibility
                WHERE shop_item_visibility.shop_item_id = shop_items.id
                AND shop_item_visibility.household_member_id = ?
            )
        )`);
        params.push(forMemberId);
    }

    return db.all(
        `SELECT ${ITEM_COLUMNS}
         FROM shop_items
         WHERE ${conditions.join(" AND ")}
         ORDER BY shop_items.created_at DESC`,
        params
    );
}

async function updateItem(id, patch) {
    const db = getDatabase();

    const assignments = [];
    const params = [];

    for (const [field, column] of Object.entries(ITEM_PATCH_COLUMNS)) {
        if (patch[field] === undefined) {
            continue;
        }

        let value = patch[field];

        if (field === "disappearsAfterPurchase") {
            value = value ? 1 : 0;
        }

        assignments.push(`${column} = ?`);
        params.push(value);
    }

    if (assignments.length > 0) {
        assignments.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);

        await db.run(
            `UPDATE shop_items
             SET ${assignments.join(", ")}
             WHERE id = ?`,
            params
        );
    }

    return getItemById(id);
}

async function delistItem(id) {
    const db = getDatabase();

    await db.run(
        `UPDATE shop_items
         SET is_active = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
    );
}

// ---- Synlighet ----

async function replaceVisibility(itemId, memberIds) {
    const db = getDatabase();

    await db.run(
        `DELETE FROM shop_item_visibility
         WHERE shop_item_id = ?`,
        [itemId]
    );

    for (const memberId of memberIds) {
        await db.run(
            `INSERT INTO shop_item_visibility (shop_item_id, household_member_id)
             VALUES (?, ?)`,
            [itemId, memberId]
        );
    }
}

async function getVisibilityForItems(itemIds) {
    if (itemIds.length === 0) {
        return [];
    }

    const db = getDatabase();
    const placeholders = itemIds.map(() => "?").join(", ");

    return db.all(
        `SELECT shop_item_id AS itemId,
                household_member_id AS memberId
         FROM shop_item_visibility
         WHERE shop_item_id IN (${placeholders})`,
        itemIds
    );
}

async function isItemVisibleToMember(itemId, memberId) {
    const db = getDatabase();

    const restricted = await db.get(
        `SELECT 1 AS restricted
         FROM shop_item_visibility
         WHERE shop_item_id = ?
         LIMIT 1`,
        [itemId]
    );

    if (!restricted) {
        return true;
    }

    const allowed = await db.get(
        `SELECT 1 AS allowed
         FROM shop_item_visibility
         WHERE shop_item_id = ?
         AND household_member_id = ?`,
        [itemId, memberId]
    );

    return Boolean(allowed);
}

// ---- Köp ----

async function createPurchase({ shopItemId, householdId, buyerMemberId, cost }) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO shop_purchases (
            shop_item_id,
            household_id,
            buyer_member_id,
            cost,
            status
        ) VALUES (?, ?, ?, ?, ?)`,
        [shopItemId, householdId, buyerMemberId, cost, PurchaseStatus.COMPLETED]
    );

    return getPurchaseById(result.lastID);
}

async function getPurchaseById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT
            shop_purchases.id,
            shop_purchases.shop_item_id AS shopItemId,
            shop_purchases.household_id AS householdId,
            shop_purchases.buyer_member_id AS buyerMemberId,
            shop_purchases.cost,
            shop_purchases.status,
            shop_purchases.created_at AS createdAt
         FROM shop_purchases
         WHERE shop_purchases.id = ?`,
        [id]
    );
}

async function getPurchasesForHousehold({ householdId, memberId }) {
    const db = getDatabase();

    const conditions = ["shop_purchases.household_id = ?"];
    const params = [householdId];

    if (memberId) {
        conditions.push("shop_purchases.buyer_member_id = ?");
        params.push(memberId);
    }

    return db.all(
        `SELECT
            shop_purchases.id,
            shop_purchases.shop_item_id AS shopItemId,
            shop_purchases.buyer_member_id AS buyerMemberId,
            shop_purchases.cost,
            shop_purchases.status,
            shop_purchases.created_at AS createdAt,
            shop_items.title AS itemTitle,
            COALESCE(household_members.display_name, users.display_name) AS buyerDisplayName
         FROM shop_purchases
         JOIN shop_items ON shop_items.id = shop_purchases.shop_item_id
         JOIN household_members ON household_members.id = shop_purchases.buyer_member_id
         LEFT JOIN users ON users.id = household_members.user_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY shop_purchases.id DESC`,
        params
    );
}

// ---- Inställningar ----

async function getShopSettings(householdId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT
            shop_enabled AS shopEnabled,
            points_enabled AS pointsEnabled,
            children_can_buy_rewards AS childrenCanBuyRewards
         FROM household_settings
         WHERE household_id = ?`,
        [householdId]
    );

    if (!row) {
        return { shopEnabled: true, pointsEnabled: true, childrenCanBuyRewards: false };
    }

    return {
        shopEnabled: row.shopEnabled === 1,
        pointsEnabled: row.pointsEnabled === 1,
        childrenCanBuyRewards: row.childrenCanBuyRewards === 1
    };
}

module.exports = {
    createPreset,
    getPresetById,
    getPresetsForHousehold,
    updatePreset,
    deactivatePreset,
    createItem,
    getItemById,
    getItemsForHousehold,
    updateItem,
    delistItem,
    replaceVisibility,
    getVisibilityForItems,
    isItemVisibleToMember,
    createPurchase,
    getPurchaseById,
    getPurchasesForHousehold,
    getShopSettings
};

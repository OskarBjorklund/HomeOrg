const { getDatabase } = require("../../database/database");
const { InventoryStatus } = require("./constants");

const INVENTORY_COLUMNS = `
    id,
    household_id AS householdId,
    owner_member_id AS ownerMemberId,
    shop_purchase_id AS shopPurchaseId,
    title,
    description,
    icon,
    color,
    uses_total AS usesTotal,
    uses_left AS usesLeft,
    activation_count AS activationCount,
    last_activated_at AS lastActivatedAt,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt
`;

// Skapas vid köp (anropas från shop-servicens transaktion).
// uses_total/uses_left = NULL betyder permanent — tar aldrig slut.
async function createInventoryItem(data) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO inventory_items (
            household_id,
            owner_member_id,
            shop_purchase_id,
            title,
            description,
            icon,
            color,
            uses_total,
            uses_left
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.householdId,
            data.ownerMemberId,
            data.shopPurchaseId,
            data.title,
            data.description,
            data.icon,
            data.color,
            data.usesTotal,
            data.usesLeft
        ]
    );

    return getInventoryItemById(result.lastID);
}

async function getInventoryItemById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT ${INVENTORY_COLUMNS}
         FROM inventory_items
         WHERE id = ?`,
        [id]
    );
}

async function getInventoryForMember(memberId) {
    const db = getDatabase();

    return db.all(
        `SELECT ${INVENTORY_COLUMNS}
         FROM inventory_items
         WHERE owner_member_id = ?
         ORDER BY created_at DESC, id DESC`,
        [memberId]
    );
}

async function recordActivation(id, { usesLeft, status }) {
    const db = getDatabase();

    await db.run(
        `UPDATE inventory_items
         SET uses_left = ?,
             status = ?,
             activation_count = activation_count + 1,
             last_activated_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [usesLeft, status, id]
    );

    return getInventoryItemById(id);
}

module.exports = {
    InventoryStatus,
    createInventoryItem,
    getInventoryItemById,
    getInventoryForMember,
    recordActivation
};

const { getDatabase } = require("../../database/database");

async function insertLedgerEntry({
    householdId,
    memberId,
    amount,
    reason,
    choreInstanceId = null,
    shopPurchaseId = null
}) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO points_ledger (
            household_id,
            household_member_id,
            amount,
            reason,
            chore_instance_id,
            shop_purchase_id
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [householdId, memberId, amount, reason, choreInstanceId, shopPurchaseId]
    );

    return result.lastID;
}

async function addToMemberBalance(memberId, amount) {
    const db = getDatabase();

    await db.run(
        `UPDATE household_members
         SET points_balance = points_balance + ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [amount, memberId]
    );
}

async function getBalanceForMember(memberId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT points_balance AS pointsBalance
         FROM household_members
         WHERE id = ?`,
        [memberId]
    );

    return row ? row.pointsBalance : null;
}

module.exports = {
    insertLedgerEntry,
    addToMemberBalance,
    getBalanceForMember
};

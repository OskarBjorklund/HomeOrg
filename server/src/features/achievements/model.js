const { getDatabase } = require("../../database/database");
const { InstanceStatus } = require("../choreInstances/constants");

// Antal godkända sysslor räknas ur chore_instances (inte points_ledger),
// så att achievements fungerar även i hushåll med poäng avstängda.
async function countApprovedChores(memberId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT COUNT(*) AS count
         FROM chore_instances
         WHERE completed_by_member_id = ?
         AND status = ?`,
        [memberId, InstanceStatus.APPROVED]
    );

    return row.count;
}

async function sumPointsEarned(memberId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM points_ledger
         WHERE household_member_id = ?
         AND amount > 0`,
        [memberId]
    );

    return row.total;
}

async function countPurchases(memberId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT COUNT(*) AS count
         FROM shop_purchases
         WHERE buyer_member_id = ?`,
        [memberId]
    );

    return row.count;
}

// Flest godkända sysslor under en och samma dag (baserat på approved_at).
async function maxApprovedChoresInOneDay(memberId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT COALESCE(MAX(dayCount), 0) AS max
         FROM (
             SELECT COUNT(*) AS dayCount
             FROM chore_instances
             WHERE completed_by_member_id = ?
             AND status = ?
             AND approved_at IS NOT NULL
             GROUP BY date(approved_at)
         )`,
        [memberId, InstanceStatus.APPROVED]
    );

    return row.max;
}

async function getUnlocksForMember(memberId) {
    const db = getDatabase();

    return db.all(
        `SELECT
            achievement_key AS achievementKey,
            unlocked_at AS unlockedAt
         FROM member_achievements
         WHERE household_member_id = ?`,
        [memberId]
    );
}

// INSERT OR IGNORE + UNIQUE(member, key) gör upplåsningen idempotent —
// dubbla sync-anrop kan aldrig ge dubbla rader.
async function insertUnlock({ householdId, memberId, achievementKey }) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT OR IGNORE INTO member_achievements
            (household_id, household_member_id, achievement_key)
         VALUES (?, ?, ?)`,
        [householdId, memberId, achievementKey]
    );

    return result.changes > 0;
}

async function getMemberInHousehold(memberId, householdId) {
    const db = getDatabase();

    return db.get(
        `SELECT id, household_id, is_active
         FROM household_members
         WHERE id = ?
         AND household_id = ?
         AND is_active = 1`,
        [memberId, householdId]
    );
}

module.exports = {
    countApprovedChores,
    sumPointsEarned,
    countPurchases,
    maxApprovedChoresInOneDay,
    getUnlocksForMember,
    insertUnlock,
    getMemberInHousehold
};

const { getDatabase } = require("../../database/database");

const LEDGER_COLUMNS = `
    points_ledger.id,
    points_ledger.household_member_id AS memberId,
    points_ledger.amount,
    points_ledger.reason,
    points_ledger.note,
    points_ledger.chore_instance_id AS choreInstanceId,
    points_ledger.shop_purchase_id AS shopPurchaseId,
    points_ledger.created_by_member_id AS createdByMemberId,
    points_ledger.created_at AS createdAt,
    COALESCE(household_members.display_name, users.display_name) AS memberDisplayName,
    COALESCE(actors.display_name, actor_users.display_name) AS createdByDisplayName,
    chore_instances.title AS choreTitle
`;

const LEDGER_JOINS = `
    JOIN household_members ON household_members.id = points_ledger.household_member_id
    LEFT JOIN users ON users.id = household_members.user_id
    LEFT JOIN household_members AS actors ON actors.id = points_ledger.created_by_member_id
    LEFT JOIN users AS actor_users ON actor_users.id = actors.user_id
    LEFT JOIN chore_instances ON chore_instances.id = points_ledger.chore_instance_id
`;

function buildLedgerFilters(filters) {
    const conditions = ["points_ledger.household_id = ?"];
    const params = [filters.householdId];

    if (filters.memberId) {
        conditions.push("points_ledger.household_member_id = ?");
        params.push(filters.memberId);
    }

    if (filters.reason) {
        conditions.push("points_ledger.reason = ?");
        params.push(filters.reason);
    }

    if (filters.from) {
        conditions.push("date(points_ledger.created_at) >= ?");
        params.push(filters.from);
    }

    if (filters.to) {
        conditions.push("date(points_ledger.created_at) <= ?");
        params.push(filters.to);
    }

    return { conditions, params };
}

async function insertLedgerEntry({
    householdId,
    memberId,
    amount,
    reason,
    note = null,
    choreInstanceId = null,
    shopPurchaseId = null,
    createdByMemberId = null
}) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO points_ledger (
            household_id,
            household_member_id,
            amount,
            reason,
            note,
            chore_instance_id,
            shop_purchase_id,
            created_by_member_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            householdId,
            memberId,
            amount,
            reason,
            note,
            choreInstanceId,
            shopPurchaseId,
            createdByMemberId
        ]
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

async function getMemberInHousehold(memberId, householdId) {
    const db = getDatabase();

    return db.get(
        `SELECT id, role
         FROM household_members
         WHERE id = ?
         AND household_id = ?
         AND is_active = 1`,
        [memberId, householdId]
    );
}

async function getPointsEnabled(householdId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT points_enabled AS pointsEnabled
         FROM household_settings
         WHERE household_id = ?`,
        [householdId]
    );

    // Saknas inställningsraden gäller default: poäng på.
    return row ? row.pointsEnabled === 1 : true;
}

async function getLedgerForHousehold(filters) {
    const db = getDatabase();

    const { conditions, params } = buildLedgerFilters(filters);

    return db.all(
        `SELECT ${LEDGER_COLUMNS}
         FROM points_ledger
         ${LEDGER_JOINS}
         WHERE ${conditions.join(" AND ")}
         ORDER BY points_ledger.id DESC
         LIMIT ? OFFSET ?`,
        [...params, filters.limit, filters.offset]
    );
}

async function countLedgerForHousehold(filters) {
    const db = getDatabase();

    const { conditions, params } = buildLedgerFilters(filters);

    const row = await db.get(
        `SELECT COUNT(*) AS total
         FROM points_ledger
         WHERE ${conditions.join(" AND ")}`,
        params
    );

    return row ? row.total : 0;
}

async function getSummaryForHousehold(householdId) {
    const db = getDatabase();

    return db.all(
        `SELECT
            household_members.id AS memberId,
            COALESCE(household_members.display_name, users.display_name) AS displayName,
            household_members.role,
            household_members.is_child_account AS isChildAccount,
            household_members.color,
            COALESCE(household_members.avatar_url, users.avatar_url) AS avatarUrl,
            household_members.points_balance AS balance,
            COALESCE(SUM(CASE WHEN points_ledger.amount > 0 THEN points_ledger.amount END), 0) AS earned,
            COALESCE(ABS(SUM(CASE WHEN points_ledger.amount < 0 THEN points_ledger.amount END)), 0) AS spent,
            COUNT(points_ledger.id) AS entryCount
         FROM household_members
         LEFT JOIN users ON users.id = household_members.user_id
         LEFT JOIN points_ledger ON points_ledger.household_member_id = household_members.id
         WHERE household_members.household_id = ?
         AND household_members.is_active = 1
         GROUP BY household_members.id
         ORDER BY balance DESC, displayName ASC`,
        [householdId]
    );
}

module.exports = {
    insertLedgerEntry,
    addToMemberBalance,
    getBalanceForMember,
    getMemberInHousehold,
    getPointsEnabled,
    getLedgerForHousehold,
    countLedgerForHousehold,
    getSummaryForHousehold
};

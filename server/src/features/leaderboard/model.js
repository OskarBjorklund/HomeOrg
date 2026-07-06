const { getDatabase } = require("../../database/database");
const { LedgerReason } = require("../points/constants");
const { Defaults } = require("./constants");

async function getWeekStartsOn(householdId) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT week_starts_on AS weekStartsOn
         FROM household_settings
         WHERE household_id = ?`,
        [householdId]
    );

    return row ? row.weekStartsOn : Defaults.WEEK_STARTS_ON;
}

// Intjänade poäng (positiva ledger-rader) per medlem inom en period.
// Datumfiltren ligger i JOIN-villkoret så att medlemmar utan poäng
// ändå kommer med (med nollor).
async function getEarnedLeaderboard({ householdId, from, to }) {
    const db = getDatabase();

    const joinConditions = [
        "points_ledger.household_member_id = household_members.id"
    ];
    const params = [LedgerReason.CHORE_APPROVED];

    if (from) {
        joinConditions.push("date(points_ledger.created_at) >= ?");
        params.push(from);
    }

    if (to) {
        joinConditions.push("date(points_ledger.created_at) <= ?");
        params.push(to);
    }

    params.push(householdId);

    return db.all(
        `SELECT
            household_members.id AS memberId,
            COALESCE(household_members.display_name, users.display_name) AS displayName,
            household_members.role,
            household_members.is_child_account AS isChildAccount,
            household_members.color,
            COALESCE(household_members.avatar_url, users.avatar_url) AS avatarUrl,
            household_members.points_balance AS balance,
            COALESCE(SUM(CASE WHEN points_ledger.amount > 0 THEN points_ledger.amount ELSE 0 END), 0) AS earned,
            COALESCE(SUM(CASE WHEN points_ledger.reason = ? AND points_ledger.amount > 0 THEN 1 ELSE 0 END), 0) AS completedChores
         FROM household_members
         LEFT JOIN users ON users.id = household_members.user_id
         LEFT JOIN points_ledger ON ${joinConditions.join(" AND ")}
         WHERE household_members.household_id = ?
         AND household_members.is_active = 1
         GROUP BY household_members.id
         ORDER BY earned DESC, displayName ASC`,
        params
    );
}

module.exports = {
    getWeekStartsOn,
    getEarnedLeaderboard
};

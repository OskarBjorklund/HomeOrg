const { getDatabase } = require("../../database/database");
const { InstanceStatus } = require("../choreInstances/constants");

async function getMembersSummary(householdId) {
    const db = getDatabase();

    return db.all(
        `SELECT
            household_members.id,
            household_members.role,
            COALESCE(household_members.display_name, users.display_name) AS displayName,
            COALESCE(household_members.avatar_url, users.avatar_url) AS avatarUrl,
            household_members.color,
            household_members.points_balance AS pointsBalance,
            household_members.is_child_account AS isChildAccount
         FROM household_members
         LEFT JOIN users ON users.id = household_members.user_id
         WHERE household_members.household_id = ?
         AND household_members.is_active = 1
         ORDER BY household_members.points_balance DESC, displayName ASC`,
        [householdId]
    );
}

async function getInstanceStats(householdId, today) {
    const db = getDatabase();

    const row = await db.get(
        `SELECT
            SUM(CASE WHEN status IN (?, ?) AND due_date = ? THEN 1 ELSE 0 END) AS dueToday,
            SUM(CASE WHEN status IN (?, ?) AND due_date < ? THEN 1 ELSE 0 END) AS overdue,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS pendingApproval,
            SUM(CASE WHEN status = ? AND date(approved_at) = ? THEN 1 ELSE 0 END) AS approvedToday
         FROM chore_instances
         WHERE household_id = ?`,
        [
            InstanceStatus.OPEN,
            InstanceStatus.CLAIMED,
            today,
            InstanceStatus.OPEN,
            InstanceStatus.CLAIMED,
            today,
            InstanceStatus.COMPLETED,
            InstanceStatus.APPROVED,
            today,
            householdId
        ]
    );

    return {
        dueToday: row?.dueToday || 0,
        overdue: row?.overdue || 0,
        pendingApproval: row?.pendingApproval || 0,
        approvedToday: row?.approvedToday || 0
    };
}

module.exports = {
    getMembersSummary,
    getInstanceStats
};

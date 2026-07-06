const { getDatabase } = require("../../database/database");
const { Roles } = require("./constants");

async function createHousehold({ name, description, createdByUserId }) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO households (name, description, created_by_user_id)
         VALUES (?, ?, ?)`,
        [name, description || null, createdByUserId]
    );

    return getHouseholdById(result.lastID);
}

async function getHouseholdById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT *
         FROM households
         WHERE id = ?`,
        [id]
    );
}

async function addMember({ householdId, userId, role = Roles.OWNER, displayName = null }) {
    const db = getDatabase();

    await db.run(
        `INSERT INTO household_members (
            household_id,
            user_id,
            role,
            display_name
        ) VALUES (?, ?, ?, ?)`,
        [householdId, userId, role, displayName]
    );
}

async function createDefaultSettings(householdId) {
    const db = getDatabase();

    await db.run(
        `INSERT INTO household_settings (household_id)
         VALUES (?)`,
        [householdId]
    );
}

async function getHouseholdsForUser(userId) {
    const db = getDatabase();

    return db.all(
        `SELECT
            households.id,
            households.name,
            households.description,
            household_members.role,
            household_members.points_balance AS pointsBalance,
            household_members.display_name AS memberDisplayName
         FROM household_members
         JOIN households ON households.id = household_members.household_id
         WHERE household_members.user_id = ?
         AND household_members.is_active = 1
         AND households.is_active = 1
         ORDER BY households.created_at DESC`,
        [userId]
    );
}

async function getMember({ householdId, userId }) {
    const db = getDatabase();

    return db.get(
        `SELECT *
         FROM household_members
         WHERE household_id = ?
         AND user_id = ?
         AND is_active = 1`,
        [householdId, userId]
    );
}

async function createInvite({ householdId, inviteCode, role, createdByUserId, expiresAt }) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO household_invites (
            household_id,
            invite_code,
            role,
            created_by_user_id,
            expires_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [householdId, inviteCode, role, createdByUserId, expiresAt]
    );

    return db.get(
        `SELECT *
         FROM household_invites
         WHERE id = ?`,
        [result.lastID]
    );
}

async function getInviteByCode(inviteCode) {
    const db = getDatabase();

    return db.get(
        `SELECT *
         FROM household_invites
         WHERE invite_code = ?`,
        [inviteCode]
    );
}

async function markInviteUsed({ inviteId, usedByUserId }) {
    const db = getDatabase();

    await db.run(
        `UPDATE household_invites
         SET used_by_user_id = ?,
             used_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [usedByUserId, inviteId]
    );
}

const MEMBER_COLUMNS = `
    household_members.id,
    household_members.user_id AS userId,
    household_members.household_id AS householdId,
    household_members.role,
    COALESCE(household_members.display_name, users.display_name) AS displayName,
    household_members.color,
    COALESCE(household_members.avatar_url, users.avatar_url) AS avatarUrl,
    household_members.points_balance AS pointsBalance,
    household_members.is_child_account AS isChildAccount,
    household_members.is_active AS isActive,
    household_members.joined_at AS joinedAt
`;

const MEMBER_PATCH_COLUMNS = {
    role: "role",
    displayName: "display_name",
    color: "color",
    avatarUrl: "avatar_url",
    isChildAccount: "is_child_account"
};

const SETTINGS_PATCH_COLUMNS = {
    pointsEnabled: "points_enabled",
    shopEnabled: "shop_enabled",
    choresNeedApproval: "chores_need_approval",
    childrenCanBuyRewards: "children_can_buy_rewards",
    weekStartsOn: "week_starts_on",
    timezone: "timezone",
    defaultCurrency: "default_currency"
};

const BOOLEAN_MEMBER_FIELDS = ["isChildAccount"];
const BOOLEAN_SETTINGS_FIELDS = [
    "pointsEnabled",
    "shopEnabled",
    "choresNeedApproval",
    "childrenCanBuyRewards"
];

async function getSettings(householdId) {
    const db = getDatabase();

    return db.get(
        `SELECT
            household_id AS householdId,
            points_enabled AS pointsEnabled,
            shop_enabled AS shopEnabled,
            chores_need_approval AS choresNeedApproval,
            children_can_buy_rewards AS childrenCanBuyRewards,
            week_starts_on AS weekStartsOn,
            timezone,
            default_currency AS defaultCurrency,
            updated_at AS updatedAt
         FROM household_settings
         WHERE household_id = ?`,
        [householdId]
    );
}

async function updateSettings(householdId, patch) {
    const db = getDatabase();

    const assignments = [];
    const params = [];

    for (const [field, column] of Object.entries(SETTINGS_PATCH_COLUMNS)) {
        if (patch[field] === undefined) {
            continue;
        }

        let value = patch[field];

        if (BOOLEAN_SETTINGS_FIELDS.includes(field)) {
            value = value ? 1 : 0;
        }

        assignments.push(`${column} = ?`);
        params.push(value);
    }

    if (assignments.length > 0) {
        assignments.push("updated_at = CURRENT_TIMESTAMP");
        params.push(householdId);

        await db.run(
            `UPDATE household_settings
             SET ${assignments.join(", ")}
             WHERE household_id = ?`,
            params
        );
    }

    return getSettings(householdId);
}

async function getMembersForHousehold(householdId) {
    const db = getDatabase();

    return db.all(
        `SELECT ${MEMBER_COLUMNS}
         FROM household_members
         LEFT JOIN users ON users.id = household_members.user_id
         WHERE household_members.household_id = ?
         AND household_members.is_active = 1
         ORDER BY household_members.joined_at ASC, household_members.id ASC`,
        [householdId]
    );
}

async function getMemberById(memberId) {
    const db = getDatabase();

    return db.get(
        `SELECT ${MEMBER_COLUMNS}
         FROM household_members
         LEFT JOIN users ON users.id = household_members.user_id
         WHERE household_members.id = ?`,
        [memberId]
    );
}

async function updateMember(memberId, patch) {
    const db = getDatabase();

    const assignments = [];
    const params = [];

    for (const [field, column] of Object.entries(MEMBER_PATCH_COLUMNS)) {
        if (patch[field] === undefined) {
            continue;
        }

        let value = patch[field];

        if (BOOLEAN_MEMBER_FIELDS.includes(field)) {
            value = value ? 1 : 0;
        }

        assignments.push(`${column} = ?`);
        params.push(value);
    }

    if (assignments.length > 0) {
        assignments.push("updated_at = CURRENT_TIMESTAMP");
        params.push(memberId);

        await db.run(
            `UPDATE household_members
             SET ${assignments.join(", ")}
             WHERE id = ?`,
            params
        );
    }

    return getMemberById(memberId);
}

async function deactivateMember(memberId) {
    const db = getDatabase();

    await db.run(
        `UPDATE household_members
         SET is_active = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [memberId]
    );
}

// Inkluderar inaktiva medlemskap — används vid join för att kunna
// återaktivera någon som tidigare lämnat (UNIQUE-constraint annars).
async function getMemberAnyStatus({ householdId, userId }) {
    const db = getDatabase();

    return db.get(
        `SELECT *
         FROM household_members
         WHERE household_id = ?
         AND user_id = ?`,
        [householdId, userId]
    );
}

async function reactivateMember(memberId, role) {
    const db = getDatabase();

    await db.run(
        `UPDATE household_members
         SET is_active = 1,
             role = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [role, memberId]
    );
}

async function getInvitesForHousehold(householdId) {
    const db = getDatabase();

    return db.all(
        `SELECT
            id,
            household_id AS householdId,
            invite_code AS inviteCode,
            role,
            created_by_user_id AS createdByUserId,
            used_by_user_id AS usedByUserId,
            expires_at AS expiresAt,
            used_at AS usedAt,
            created_at AS createdAt
         FROM household_invites
         WHERE household_id = ?
         ORDER BY id DESC`,
        [householdId]
    );
}

async function getInviteById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT *
         FROM household_invites
         WHERE id = ?`,
        [id]
    );
}

async function deleteInvite(id) {
    const db = getDatabase();

    await db.run(
        `DELETE FROM household_invites
         WHERE id = ?`,
        [id]
    );
}

async function logActivity({ householdId, actorUserId, action, entityType, entityId, message, metadataJson }) {
    const db = getDatabase();

    await db.run(
        `INSERT INTO household_activity_log (
            household_id,
            actor_user_id,
            action,
            entity_type,
            entity_id,
            message,
            metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            householdId,
            actorUserId || null,
            action,
            entityType || null,
            entityId || null,
            message || null,
            metadataJson || null
        ]
    );
}

module.exports = {
    createHousehold,
    getHouseholdById,
    addMember,
    createDefaultSettings,
    getHouseholdsForUser,
    getMember,
    createInvite,
    getInviteByCode,
    markInviteUsed,
    logActivity,
    getSettings,
    updateSettings,
    getMembersForHousehold,
    getMemberById,
    updateMember,
    deactivateMember,
    getMemberAnyStatus,
    reactivateMember,
    getInvitesForHousehold,
    getInviteById,
    deleteInvite
};
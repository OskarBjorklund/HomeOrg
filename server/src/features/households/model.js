const { getDatabase } = require("../../database/database");
const { Roles, InviteLength, InviteLifetimeDays } = require("./constants");

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
    logActivity
};
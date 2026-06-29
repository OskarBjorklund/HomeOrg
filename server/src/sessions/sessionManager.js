const crypto = require("crypto");
const { getDatabase } = require("../database/database");

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24; // 24 timmar

function generateSessionId() {
    return crypto.randomBytes(32).toString("hex");
}

function toSqlDate(date) {
    return date.toISOString();
}

async function createSession(userId, householdId = null) {
    const db = getDatabase();

    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

    await db.run(
        `INSERT INTO sessions (
            id,
            user_id,
            household_id,
            created_at,
            last_activity_at,
            expires_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            sessionId,
            userId,
            householdId,
            toSqlDate(now),
            toSqlDate(now),
            toSqlDate(expiresAt)
        ]
    );

    return {
        id: sessionId,
        userId,
        householdId,
        expiresAt: toSqlDate(expiresAt)
    };
}

async function getSession(sessionId) {
    if (!sessionId) {
        return null;
    }

    const db = getDatabase();

    const session = await db.get(
        `SELECT
            sessions.id,
            sessions.user_id AS userId,
            sessions.household_id AS householdId,
            sessions.created_at AS createdAt,
            sessions.last_activity_at AS lastActivityAt,
            sessions.expires_at AS expiresAt,
            users.username,
            users.display_name AS displayName
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.id = ?`,
        [sessionId]
    );

    if (!session) {
        return null;
    }

    if (isExpired(session)) {
        await destroySession(sessionId);
        return null;
    }

    return session;
}

function isExpired(session) {
    return new Date(session.expiresAt).getTime() <= Date.now();
}

async function updateActivity(sessionId) {
    if (!sessionId) {
        return;
    }

    const db = getDatabase();

    await db.run(
        `UPDATE sessions
         SET last_activity_at = ?
         WHERE id = ?`,
        [toSqlDate(new Date()), sessionId]
    );
}

async function destroySession(sessionId) {
    if (!sessionId) {
        return;
    }

    const db = getDatabase();

    await db.run(
        `DELETE FROM sessions
         WHERE id = ?`,
        [sessionId]
    );
}

async function destroyAllUserSessions(userId) {
    const db = getDatabase();

    await db.run(
        `DELETE FROM sessions
         WHERE user_id = ?`,
        [userId]
    );
}

async function destroyOtherUserSessions(userId, currentSessionId) {
    const db = getDatabase();

    await db.run(
        `DELETE FROM sessions
         WHERE user_id = ?
         AND id != ?`,
        [userId, currentSessionId]
    );
}

async function cleanupExpiredSessions() {
    const db = getDatabase();

    await db.run(
        `DELETE FROM sessions
         WHERE expires_at <= ?`,
        [toSqlDate(new Date())]
    );
}

async function setHousehold(sessionId, householdId) {
    const db = getDatabase();

    await db.run(
        `UPDATE sessions
         SET household_id = ?
         WHERE id = ?`,
        [householdId, sessionId]
    );
}

module.exports = {
    createSession,
    getSession,
    updateActivity,
    destroySession,
    destroyAllUserSessions,
    destroyOtherUserSessions,
    cleanupExpiredSessions,
    setHousehold,
    isExpired
};
const { getDatabase } = require("../../database/database");

async function findUserByUsername(username) {
    const db = getDatabase();

    return db.get(
        `SELECT *
         FROM users
         WHERE username = ?`,
        [username]
    );
}

async function findUserById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT id, username, display_name AS displayName, avatar_url AS avatarUrl, is_active AS isActive
         FROM users
         WHERE id = ?`,
        [id]
    );
}

async function createUser({ username, passwordHash, displayName }) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO users (username, password_hash, display_name)
         VALUES (?, ?, ?)`,
        [username, passwordHash, displayName]
    );

    return findUserById(result.lastID);
}

module.exports = {
    findUserByUsername,
    findUserById,
    createUser
};
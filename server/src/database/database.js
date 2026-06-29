const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("fs/promises");
const path = require("path");

let db = null;

const databasePath = path.join(__dirname, "homeorg.db");
const schemaPath = path.join(__dirname, "schema.sql");

async function initDatabase() {
    if (db) {
        return db;
    }

    db = await open({
        filename: databasePath,
        driver: sqlite3.Database
    });

    await db.exec("PRAGMA foreign_keys = ON;");

    const schema = await fs.readFile(schemaPath, "utf8");
    await db.exec(schema);

    console.log("Database connected and schema loaded");

    return db;
}

function getDatabase() {
    if (!db) {
        throw new Error("Database has not been initialized. Call initDatabase() first.");
    }

    return db;
}

async function closeDatabase() {
    if (db) {
        await db.close();
        db = null;
        console.log("Database closed");
    }
}

module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase
};
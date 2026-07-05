const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("fs/promises");
const path = require("path");

let db = null;

const databasePath = path.join(__dirname, "homeorg.db");
const schemaPath = path.join(__dirname, "schema.sql");
const resetPath = path.join(__dirname, "reset.sql");

async function applySchema(database) {
    const schema = await fs.readFile(schemaPath, "utf8");
    await database.exec(schema);
}

async function initDatabase() {
    if (db) {
        return db;
    }

    db = await open({
        filename: databasePath,
        driver: sqlite3.Database
    });

    await db.exec("PRAGMA foreign_keys = ON;");

    // Idempotent: skapar tabeller som saknas, rör inte befintlig data.
    await applySchema(db);

    console.log("Database connected and schema ensured");

    return db;
}

function getDatabase() {
    if (!db) {
        throw new Error("Database has not been initialized. Call initDatabase() first.");
    }

    return db;
}

// Kör en serie writes atomärt. Vid fel rullas allt tillbaka så att vi aldrig
// lämnar t.ex. ett halvskapat household eller en chore utan sina assignments.
async function withTransaction(fn) {
    const database = getDatabase();

    await database.exec("BEGIN");

    try {
        const result = await fn(database);
        await database.exec("COMMIT");
        return result;
    } catch (error) {
        await database.exec("ROLLBACK");
        throw error;
    }
}

// Destruktivt: droppar alla tabeller och laddar schemat på nytt.
async function resetDatabase() {
    const database = getDatabase();

    const reset = await fs.readFile(resetPath, "utf8");
    await database.exec(reset);

    await applySchema(database);

    console.log("Database reset to a clean schema");
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
    withTransaction,
    resetDatabase,
    closeDatabase
};

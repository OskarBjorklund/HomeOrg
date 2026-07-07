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

// Lägger till en kolumn om den saknas. CREATE TABLE IF NOT EXISTS rör inte
// befintliga tabeller, så nya kolumner måste migreras in i existerande databaser.
async function ensureColumn(database, table, column, definition) {
    const columns = await database.all(`PRAGMA table_info(${table})`);

    if (!columns.some((col) => col.name === column)) {
        await database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`Migration: added column ${table}.${column}`);
    }
}

// Enkla additiva migreringar. Ersätts av ett riktigt migrationssystem
// (versionstabell + migrationsfiler) när schemat börjar ändras oftare.
async function runMigrations(database) {
    await ensureColumn(database, "points_ledger", "note", "TEXT");

    await ensureColumn(database, "shop_items", "icon", "TEXT");
    await ensureColumn(database, "shop_items", "color", "TEXT");
    await ensureColumn(database, "shop_items", "uses_total", "INTEGER");
    await ensureColumn(
        database,
        "shop_items",
        "disappears_after_purchase",
        "INTEGER NOT NULL DEFAULT 0"
    );
    await ensureColumn(
        database,
        "shop_items",
        "reward_template_id",
        "INTEGER REFERENCES reward_templates(id) ON DELETE SET NULL"
    );

    await ensureColumn(
        database,
        "points_ledger",
        "created_by_member_id",
        "INTEGER REFERENCES household_members(id) ON DELETE SET NULL"
    );

    // "unassigned" och "anyone" var funktionellt identiska — sammanslagna
    // till "anyone". Idempotent datamigrering för befintliga databaser.
    await database.exec(
        `UPDATE chores SET assignment_mode = 'anyone' WHERE assignment_mode = 'unassigned'`
    );
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
    await runMigrations(db);

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
    await runMigrations(database);

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

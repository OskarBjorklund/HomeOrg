// Kör med `npm run db:reset`. Droppar alla tabeller och laddar schemat på nytt.
// Använd endast när du medvetet vill nollställa databasen.

const { initDatabase, resetDatabase, closeDatabase } = require("./database");

(async () => {
    try {
        await initDatabase();
        await resetDatabase();
        await closeDatabase();
        console.log("Done.");
    } catch (error) {
        console.error("Reset failed:", error);
        process.exit(1);
    }
})();

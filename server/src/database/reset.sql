-- Nollställer databasen genom att droppa alla tabeller.
-- Körs INTE vid vanlig serverstart. Använd via `npm run db:reset` och därefter
-- laddas schema.sql på nytt. Ordningen är barn-först för att respektera FK.

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS shop_item_visibility;
DROP TABLE IF EXISTS shop_purchases;
DROP TABLE IF EXISTS shop_items;
DROP TABLE IF EXISTS reward_templates;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS points_ledger;

DROP TABLE IF EXISTS chore_template_tags;
DROP TABLE IF EXISTS chore_tags;
DROP TABLE IF EXISTS chore_assignments;
DROP TABLE IF EXISTS chore_instances;
DROP TABLE IF EXISTS chores;

DROP TABLE IF EXISTS household_activity_log;
DROP TABLE IF EXISTS household_invites;
DROP TABLE IF EXISTS household_settings;
DROP TABLE IF EXISTS household_members;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS households;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

-- Detta schema är idempotent (CREATE TABLE IF NOT EXISTS) och körs vid varje
-- serverstart utan att röra befintlig data. För att medvetet nollställa
-- databasen, kör reset.sql (npm run db:reset) som droppar allt först.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by_user_id INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS household_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    user_id INTEGER,

    role TEXT NOT NULL DEFAULT 'member',

    display_name TEXT,
    color TEXT,
    avatar_url TEXT,

    points_balance INTEGER NOT NULL DEFAULT 0,

    is_child_account INTEGER NOT NULL DEFAULT 0,
    managed_by_user_id INTEGER,

    is_active INTEGER NOT NULL DEFAULT 1,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (household_id, user_id),

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (managed_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS household_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL UNIQUE,

    points_enabled INTEGER NOT NULL DEFAULT 1,
    shop_enabled INTEGER NOT NULL DEFAULT 1,
    chores_need_approval INTEGER NOT NULL DEFAULT 0,
    children_can_buy_rewards INTEGER NOT NULL DEFAULT 0,

    week_starts_on INTEGER NOT NULL DEFAULT 1,
    timezone TEXT NOT NULL DEFAULT 'Europe/Stockholm',
    default_currency TEXT NOT NULL DEFAULT 'SEK',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS household_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,

    invite_code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member',

    created_by_user_id INTEGER NOT NULL,
    used_by_user_id INTEGER,

    expires_at TEXT,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (used_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS household_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    actor_user_id INTEGER,

    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,

    message TEXT,
    metadata_json TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    household_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT,

    category TEXT,
    icon TEXT,
    color TEXT,

    points INTEGER NOT NULL DEFAULT 10,
    difficulty TEXT,
    estimated_minutes INTEGER,

    recurrence_type TEXT NOT NULL DEFAULT 'none',
    recurrence_interval INTEGER NOT NULL DEFAULT 1,

    priority TEXT NOT NULL DEFAULT 'normal',
    assignment_mode TEXT NOT NULL DEFAULT 'anyone',

    visible_to_children INTEGER NOT NULL DEFAULT 1,
    requires_approval INTEGER NOT NULL DEFAULT 0,

    created_by_user_id INTEGER NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1,
    is_archived INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chore_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chore_id INTEGER NOT NULL,
    household_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    icon TEXT,
    color TEXT,

    points INTEGER NOT NULL DEFAULT 10,
    difficulty TEXT,
    estimated_minutes INTEGER,
    priority TEXT NOT NULL DEFAULT 'normal',
    requires_approval INTEGER NOT NULL DEFAULT 0,

    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',

    assigned_to_member_id INTEGER,
    claimed_by_member_id INTEGER,
    completed_by_member_id INTEGER,

    completed_at TEXT,

    approved_by_member_id INTEGER,
    approved_at TEXT,

    rejected_by_member_id INTEGER,
    rejected_at TEXT,
    rejection_reason TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (chore_id)
        REFERENCES chores(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (assigned_to_member_id)
        REFERENCES household_members(id)
        ON DELETE SET NULL,

    FOREIGN KEY (claimed_by_member_id)
        REFERENCES household_members(id)
        ON DELETE SET NULL,

    FOREIGN KEY (completed_by_member_id)
        REFERENCES household_members(id)
        ON DELETE SET NULL,

    FOREIGN KEY (approved_by_member_id)
        REFERENCES household_members(id)
        ON DELETE SET NULL,

    FOREIGN KEY (rejected_by_member_id)
        REFERENCES household_members(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chore_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chore_id INTEGER NOT NULL,
    household_member_id INTEGER NOT NULL,

    UNIQUE (chore_id, household_member_id),

    FOREIGN KEY (chore_id)
        REFERENCES chores(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_member_id)
        REFERENCES household_members(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chore_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    color TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (household_id, name),

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chore_template_tags (
    chore_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    PRIMARY KEY (chore_id, tag_id),

    FOREIGN KEY (chore_id)
        REFERENCES chores(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tag_id)
        REFERENCES chore_tags(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS points_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    household_member_id INTEGER NOT NULL,

    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    note TEXT,

    chore_instance_id INTEGER,
    shop_purchase_id INTEGER,

    -- Vem som orsakade raden (godkännaren, justeraren, köparen) — kan skilja
    -- sig från household_member_id som är mottagaren.
    created_by_member_id INTEGER,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_member_id)
        REFERENCES household_members(id)
        ON DELETE CASCADE,

    FOREIGN KEY (chore_instance_id)
        REFERENCES chore_instances(id)
        ON DELETE SET NULL,

    FOREIGN KEY (shop_purchase_id)
        REFERENCES shop_purchases(id)
        ON DELETE SET NULL,

    FOREIGN KEY (created_by_member_id)
        REFERENCES household_members(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reward_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,

    default_cost INTEGER NOT NULL DEFAULT 10,
    default_uses_total INTEGER,

    created_by_user_id INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    cost INTEGER NOT NULL,

    uses_total INTEGER,
    disappears_after_purchase INTEGER NOT NULL DEFAULT 0,
    reward_template_id INTEGER,

    created_by_user_id INTEGER NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (reward_template_id)
        REFERENCES reward_templates(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shop_item_visibility (
    shop_item_id INTEGER NOT NULL,
    household_member_id INTEGER NOT NULL,

    PRIMARY KEY (shop_item_id, household_member_id),

    FOREIGN KEY (shop_item_id)
        REFERENCES shop_items(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_member_id)
        REFERENCES household_members(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shop_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_item_id INTEGER NOT NULL,
    household_id INTEGER NOT NULL,
    buyer_member_id INTEGER NOT NULL,

    cost INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    approved_by_member_id INTEGER,

    FOREIGN KEY (shop_item_id)
        REFERENCES shop_items(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (buyer_member_id)
        REFERENCES household_members(id)
        ON DELETE CASCADE,

    FOREIGN KEY (approved_by_member_id)
        REFERENCES household_members(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    owner_member_id INTEGER NOT NULL,
    shop_purchase_id INTEGER,

    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,

    uses_total INTEGER,
    uses_left INTEGER,
    activation_count INTEGER NOT NULL DEFAULT 0,
    last_activated_at TEXT,

    status TEXT NOT NULL DEFAULT 'active',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (owner_member_id)
        REFERENCES household_members(id)
        ON DELETE CASCADE,

    FOREIGN KEY (shop_purchase_id)
        REFERENCES shop_purchases(id)
        ON DELETE SET NULL
);

-- Upplåsta achievements per medlem. Katalogen av achievements (nycklar,
-- titlar, trösklar) definieras i kod (features/achievements/definitions.js) —
-- tabellen lagrar bara faktumet att en medlem låst upp en av dem.
CREATE TABLE IF NOT EXISTS member_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    household_member_id INTEGER NOT NULL,

    achievement_key TEXT NOT NULL,

    unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (household_member_id, achievement_key),

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_member_id)
        REFERENCES household_members(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    household_member_id INTEGER,

    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (household_id)
        REFERENCES households(id)
        ON DELETE CASCADE,

    FOREIGN KEY (household_member_id)
        REFERENCES household_members(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_household_id
ON sessions(household_id);

CREATE INDEX IF NOT EXISTS idx_household_members_household_id
ON household_members(household_id);

CREATE INDEX IF NOT EXISTS idx_household_members_user_id
ON household_members(user_id);

CREATE INDEX IF NOT EXISTS idx_household_members_household_user
ON household_members(household_id, user_id);

CREATE INDEX IF NOT EXISTS idx_household_invites_code
ON household_invites(invite_code);

CREATE INDEX IF NOT EXISTS idx_household_invites_household_id
ON household_invites(household_id);

CREATE INDEX IF NOT EXISTS idx_household_activity_log_household_id
ON household_activity_log(household_id);

CREATE INDEX IF NOT EXISTS idx_household_activity_log_entity
ON household_activity_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_chores_household_id
ON chores(household_id);

CREATE INDEX IF NOT EXISTS idx_chores_household_active_archived
ON chores(household_id, is_active, is_archived);

CREATE INDEX IF NOT EXISTS idx_chore_instances_chore_id
ON chore_instances(chore_id);

CREATE INDEX IF NOT EXISTS idx_chore_instances_household_due_date
ON chore_instances(household_id, due_date);

CREATE INDEX IF NOT EXISTS idx_chore_instances_household_status_due_date
ON chore_instances(household_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_chore_instances_status
ON chore_instances(status);

CREATE INDEX IF NOT EXISTS idx_chore_instances_assigned_to_member_id
ON chore_instances(assigned_to_member_id);

CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id
ON chore_assignments(chore_id);

CREATE INDEX IF NOT EXISTS idx_chore_assignments_household_member_id
ON chore_assignments(household_member_id);

CREATE INDEX IF NOT EXISTS idx_chore_tags_household_id
ON chore_tags(household_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_household_id
ON points_ledger(household_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_household_member_id
ON points_ledger(household_member_id);

CREATE INDEX IF NOT EXISTS idx_points_ledger_chore_instance_id
ON points_ledger(chore_instance_id);

CREATE INDEX IF NOT EXISTS idx_shop_items_household_id
ON shop_items(household_id);

CREATE INDEX IF NOT EXISTS idx_reward_templates_household_id
ON reward_templates(household_id);

CREATE INDEX IF NOT EXISTS idx_shop_item_visibility_member
ON shop_item_visibility(household_member_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_owner
ON inventory_items(owner_member_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_household_status
ON inventory_items(household_id, status);

CREATE INDEX IF NOT EXISTS idx_shop_purchases_household_id
ON shop_purchases(household_id);

CREATE INDEX IF NOT EXISTS idx_shop_purchases_buyer_member_id
ON shop_purchases(buyer_member_id);

CREATE INDEX IF NOT EXISTS idx_member_achievements_member
ON member_achievements(household_member_id);

CREATE INDEX IF NOT EXISTS idx_member_achievements_household
ON member_achievements(household_id);

CREATE INDEX IF NOT EXISTS idx_notifications_household_member_id
ON notifications(household_member_id);

CREATE INDEX IF NOT EXISTS idx_notifications_household_member_read
ON notifications(household_id, household_member_id, is_read);
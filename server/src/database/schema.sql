PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS shop_purchases;
DROP TABLE IF EXISTS shop_items;
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

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE households (
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

CREATE TABLE household_members (
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

CREATE TABLE household_settings (
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

CREATE TABLE household_invites (
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

CREATE TABLE household_activity_log (
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

CREATE TABLE sessions (
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

CREATE TABLE chores (
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
    assignment_mode TEXT NOT NULL DEFAULT 'unassigned',

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

CREATE TABLE chore_instances (
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

CREATE TABLE chore_assignments (
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

CREATE TABLE chore_tags (
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

CREATE TABLE chore_template_tags (
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

CREATE TABLE points_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    household_member_id INTEGER NOT NULL,

    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,

    chore_instance_id INTEGER,
    shop_purchase_id INTEGER,

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
        ON DELETE SET NULL
);

CREATE TABLE shop_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT,
    cost INTEGER NOT NULL,
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

CREATE TABLE shop_purchases (
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

CREATE TABLE notifications (
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

CREATE INDEX idx_sessions_user_id
ON sessions(user_id);

CREATE INDEX idx_sessions_household_id
ON sessions(household_id);

CREATE INDEX idx_household_members_household_id
ON household_members(household_id);

CREATE INDEX idx_household_members_user_id
ON household_members(user_id);

CREATE INDEX idx_household_members_household_user
ON household_members(household_id, user_id);

CREATE INDEX idx_household_invites_code
ON household_invites(invite_code);

CREATE INDEX idx_household_invites_household_id
ON household_invites(household_id);

CREATE INDEX idx_household_activity_log_household_id
ON household_activity_log(household_id);

CREATE INDEX idx_household_activity_log_entity
ON household_activity_log(entity_type, entity_id);

CREATE INDEX idx_chores_household_id
ON chores(household_id);

CREATE INDEX idx_chores_household_active_archived
ON chores(household_id, is_active, is_archived);

CREATE INDEX idx_chore_instances_chore_id
ON chore_instances(chore_id);

CREATE INDEX idx_chore_instances_household_due_date
ON chore_instances(household_id, due_date);

CREATE INDEX idx_chore_instances_household_status_due_date
ON chore_instances(household_id, status, due_date);

CREATE INDEX idx_chore_instances_status
ON chore_instances(status);

CREATE INDEX idx_chore_instances_assigned_to_member_id
ON chore_instances(assigned_to_member_id);

CREATE INDEX idx_chore_assignments_chore_id
ON chore_assignments(chore_id);

CREATE INDEX idx_chore_assignments_household_member_id
ON chore_assignments(household_member_id);

CREATE INDEX idx_chore_tags_household_id
ON chore_tags(household_id);

CREATE INDEX idx_points_ledger_household_id
ON points_ledger(household_id);

CREATE INDEX idx_points_ledger_household_member_id
ON points_ledger(household_member_id);

CREATE INDEX idx_points_ledger_chore_instance_id
ON points_ledger(chore_instance_id);

CREATE INDEX idx_shop_items_household_id
ON shop_items(household_id);

CREATE INDEX idx_shop_purchases_household_id
ON shop_purchases(household_id);

CREATE INDEX idx_shop_purchases_buyer_member_id
ON shop_purchases(buyer_member_id);

CREATE INDEX idx_notifications_household_member_id
ON notifications(household_member_id);

CREATE INDEX idx_notifications_household_member_read
ON notifications(household_id, household_member_id, is_read);
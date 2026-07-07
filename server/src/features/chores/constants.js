const { Roles } = require("../households/constants");

const RecurrenceType = {
    NONE: "none",
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly"
};

const Priority = {
    LOW: "low",
    NORMAL: "normal",
    HIGH: "high",
    URGENT: "urgent"
};

const Difficulty = {
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard"
};

// "unassigned" togs bort — den var funktionellt identisk med "anyone".
// Befintliga rader migreras vid serverstart (database.js).
const AssignmentMode = {
    ANYONE: "anyone",
    SPECIFIC: "specific",
    ROTATION: "rotation"
};

const Defaults = {
    POINTS: 10,
    RECURRENCE_INTERVAL: 1,
    PRIORITY: Priority.NORMAL,
    RECURRENCE_TYPE: RecurrenceType.NONE,
    ASSIGNMENT_MODE: AssignmentMode.ANYONE,
    VISIBLE_TO_CHILDREN: true,
    REQUIRES_APPROVAL: false
};

const Limits = {
    TITLE_MAX: 120,
    DESCRIPTION_MAX: 2000,
    CATEGORY_MAX: 50,
    ICON_MAX: 50,
    COLOR_MAX: 30,
    POINTS_MAX: 100000,
    ESTIMATED_MINUTES_MAX: 60 * 24,
    RECURRENCE_INTERVAL_MAX: 365
};

// Roller som får skapa/ändra/arkivera chore-templates.
const ChoreManagerRoles = [Roles.OWNER, Roles.ADMIN, Roles.ADULT];

module.exports = {
    RecurrenceType,
    Priority,
    Difficulty,
    AssignmentMode,
    Defaults,
    Limits,
    ChoreManagerRoles
};

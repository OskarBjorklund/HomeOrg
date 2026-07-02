const { getDatabase } = require("../../database/database");

const CHORE_COLUMNS = `
    id,
    household_id AS householdId,
    title,
    description,
    category,
    icon,
    color,
    points,
    difficulty,
    estimated_minutes AS estimatedMinutes,
    recurrence_type AS recurrenceType,
    recurrence_interval AS recurrenceInterval,
    priority,
    assignment_mode AS assignmentMode,
    visible_to_children AS visibleToChildren,
    requires_approval AS requiresApproval,
    created_by_user_id AS createdByUserId,
    is_active AS isActive,
    is_archived AS isArchived,
    created_at AS createdAt,
    updated_at AS updatedAt
`;

// Mappar camelCase-fält från service till kolumnnamn för dynamisk UPDATE.
const UPDATABLE_COLUMNS = {
    title: "title",
    description: "description",
    category: "category",
    icon: "icon",
    color: "color",
    points: "points",
    difficulty: "difficulty",
    estimatedMinutes: "estimated_minutes",
    recurrenceType: "recurrence_type",
    recurrenceInterval: "recurrence_interval",
    priority: "priority",
    assignmentMode: "assignment_mode",
    visibleToChildren: "visible_to_children",
    requiresApproval: "requires_approval"
};

function toDbBoolean(value) {
    return value ? 1 : 0;
}

async function createChore(data) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO chores (
            household_id,
            title,
            description,
            category,
            icon,
            color,
            points,
            difficulty,
            estimated_minutes,
            recurrence_type,
            recurrence_interval,
            priority,
            assignment_mode,
            visible_to_children,
            requires_approval,
            created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.householdId,
            data.title,
            data.description,
            data.category,
            data.icon,
            data.color,
            data.points,
            data.difficulty,
            data.estimatedMinutes,
            data.recurrenceType,
            data.recurrenceInterval,
            data.priority,
            data.assignmentMode,
            toDbBoolean(data.visibleToChildren),
            toDbBoolean(data.requiresApproval),
            data.createdByUserId
        ]
    );

    return getChoreById(result.lastID);
}

async function getChoreById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT ${CHORE_COLUMNS}
         FROM chores
         WHERE id = ?`,
        [id]
    );
}

async function getChoresForHousehold({ householdId, includeArchived, onlyVisibleToChildren }) {
    const db = getDatabase();

    const conditions = ["household_id = ?", "is_active = 1"];
    const params = [householdId];

    if (!includeArchived) {
        conditions.push("is_archived = 0");
    }

    if (onlyVisibleToChildren) {
        conditions.push("visible_to_children = 1");
    }

    return db.all(
        `SELECT ${CHORE_COLUMNS}
         FROM chores
         WHERE ${conditions.join(" AND ")}
         ORDER BY created_at DESC`,
        params
    );
}

async function updateChore(id, patch) {
    const db = getDatabase();

    const assignments = [];
    const params = [];

    for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
        if (patch[field] === undefined) {
            continue;
        }

        let value = patch[field];

        if (field === "visibleToChildren" || field === "requiresApproval") {
            value = toDbBoolean(value);
        }

        assignments.push(`${column} = ?`);
        params.push(value);
    }

    if (assignments.length > 0) {
        assignments.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);

        await db.run(
            `UPDATE chores
             SET ${assignments.join(", ")}
             WHERE id = ?`,
            params
        );
    }

    return getChoreById(id);
}

async function setArchived(id, isArchived) {
    const db = getDatabase();

    await db.run(
        `UPDATE chores
         SET is_archived = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [toDbBoolean(isArchived), id]
    );

    return getChoreById(id);
}

async function deleteChore(id) {
    const db = getDatabase();

    await db.run(
        `DELETE FROM chores
         WHERE id = ?`,
        [id]
    );
}

async function getMemberIdsForHousehold(householdId) {
    const db = getDatabase();

    const rows = await db.all(
        `SELECT id
         FROM household_members
         WHERE household_id = ?
         AND is_active = 1`,
        [householdId]
    );

    return rows.map((row) => row.id);
}

async function replaceAssignments(choreId, memberIds) {
    const db = getDatabase();

    await db.run(
        `DELETE FROM chore_assignments
         WHERE chore_id = ?`,
        [choreId]
    );

    for (const memberId of memberIds) {
        await db.run(
            `INSERT INTO chore_assignments (chore_id, household_member_id)
             VALUES (?, ?)`,
            [choreId, memberId]
        );
    }
}

async function getAssignedMemberIds(choreId) {
    const db = getDatabase();

    const rows = await db.all(
        `SELECT household_member_id AS memberId
         FROM chore_assignments
         WHERE chore_id = ?`,
        [choreId]
    );

    return rows.map((row) => row.memberId);
}

module.exports = {
    createChore,
    getChoreById,
    getChoresForHousehold,
    updateChore,
    setArchived,
    deleteChore,
    getMemberIdsForHousehold,
    replaceAssignments,
    getAssignedMemberIds
};

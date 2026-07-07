const { getDatabase } = require("../../database/database");
const { InstanceStatus } = require("./constants");

const INSTANCE_COLUMNS = `
    chore_instances.id,
    chore_instances.chore_id AS choreId,
    chore_instances.household_id AS householdId,
    chore_instances.title,
    chore_instances.description,
    chore_instances.category,
    chore_instances.icon,
    chore_instances.color,
    chore_instances.points,
    chore_instances.difficulty,
    chore_instances.estimated_minutes AS estimatedMinutes,
    chore_instances.priority,
    chore_instances.requires_approval AS requiresApproval,
    chore_instances.due_date AS dueDate,
    chore_instances.status,
    chore_instances.assigned_to_member_id AS assignedToMemberId,
    chore_instances.claimed_by_member_id AS claimedByMemberId,
    chore_instances.completed_by_member_id AS completedByMemberId,
    chore_instances.completed_at AS completedAt,
    chore_instances.approved_by_member_id AS approvedByMemberId,
    chore_instances.approved_at AS approvedAt,
    chore_instances.rejected_by_member_id AS rejectedByMemberId,
    chore_instances.rejected_at AS rejectedAt,
    chore_instances.rejection_reason AS rejectionReason,
    chore_instances.created_at AS createdAt,
    chore_instances.updated_at AS updatedAt
`;

async function createInstance(data) {
    const db = getDatabase();

    const result = await db.run(
        `INSERT INTO chore_instances (
            chore_id,
            household_id,
            title,
            description,
            category,
            icon,
            color,
            points,
            difficulty,
            estimated_minutes,
            priority,
            requires_approval,
            due_date,
            assigned_to_member_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.choreId,
            data.householdId,
            data.title,
            data.description,
            data.category,
            data.icon,
            data.color,
            data.points,
            data.difficulty,
            data.estimatedMinutes,
            data.priority,
            data.requiresApproval ? 1 : 0,
            data.dueDate,
            data.assignedToMemberId
        ]
    );

    return getInstanceById(result.lastID);
}

async function getInstanceById(id) {
    const db = getDatabase();

    return db.get(
        `SELECT ${INSTANCE_COLUMNS},
                chores.visible_to_children AS choreVisibleToChildren
         FROM chore_instances
         JOIN chores ON chores.id = chore_instances.chore_id
         WHERE chore_instances.id = ?`,
        [id]
    );
}

async function getInstancesForHousehold(filters) {
    const db = getDatabase();

    const conditions = ["chore_instances.household_id = ?"];
    const params = [filters.householdId];

    if (filters.status) {
        conditions.push("chore_instances.status = ?");
        params.push(filters.status);
    }

    if (filters.statuses && filters.statuses.length > 0) {
        const placeholders = filters.statuses.map(() => "?").join(", ");
        conditions.push(`chore_instances.status IN (${placeholders})`);
        params.push(...filters.statuses);
    }

    if (filters.choreId) {
        conditions.push("chore_instances.chore_id = ?");
        params.push(filters.choreId);
    }

    if (filters.assignedToMemberId) {
        conditions.push("chore_instances.assigned_to_member_id = ?");
        params.push(filters.assignedToMemberId);
    }

    if (filters.from) {
        conditions.push("chore_instances.due_date >= ?");
        params.push(filters.from);
    }

    if (filters.to) {
        conditions.push("chore_instances.due_date <= ?");
        params.push(filters.to);
    }

    if (filters.onlyVisibleToChildren) {
        conditions.push("chores.visible_to_children = 1");
    }

    return db.all(
        `SELECT ${INSTANCE_COLUMNS}
         FROM chore_instances
         JOIN chores ON chores.id = chore_instances.chore_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY chore_instances.due_date ASC, chore_instances.id ASC`,
        params
    );
}

// Används av genereringen för dedupe: vilka (dueDate, member)-par finns redan?
async function getInstancesForChoreInRange(choreId, from, to) {
    const db = getDatabase();

    return db.all(
        `SELECT due_date AS dueDate,
                assigned_to_member_id AS assignedToMemberId
         FROM chore_instances
         WHERE chore_id = ?
         AND due_date >= ?
         AND due_date <= ?`,
        [choreId, from, to]
    );
}

async function getLastInstanceForChore(choreId) {
    const db = getDatabase();

    return db.get(
        `SELECT due_date AS dueDate,
                assigned_to_member_id AS assignedToMemberId
         FROM chore_instances
         WHERE chore_id = ?
         ORDER BY due_date DESC, id DESC
         LIMIT 1`,
        [choreId]
    );
}

// Ankare för recurrence-mönstret: senaste instansen t.o.m. ett visst datum.
// Framtida (materialiserade) instanser ignoreras så att mönstrets fas
// alltid utgår från senaste faktiska förekomsten.
async function getLastInstanceOnOrBefore(choreId, date) {
    const db = getDatabase();

    return db.get(
        `SELECT due_date AS dueDate
         FROM chore_instances
         WHERE chore_id = ?
         AND due_date <= ?
         ORDER BY due_date DESC, id DESC
         LIMIT 1`,
        [choreId, date]
    );
}

async function getLastAssignedInstanceForChore(choreId) {
    const db = getDatabase();

    return db.get(
        `SELECT assigned_to_member_id AS assignedToMemberId
         FROM chore_instances
         WHERE chore_id = ?
         AND assigned_to_member_id IS NOT NULL
         ORDER BY due_date DESC, id DESC
         LIMIT 1`,
        [choreId]
    );
}

async function claimInstance(id, memberId) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET status = ?,
             claimed_by_member_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [InstanceStatus.CLAIMED, memberId, id]
    );

    return getInstanceById(id);
}

async function unclaimInstance(id) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET status = ?,
             claimed_by_member_id = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [InstanceStatus.OPEN, id]
    );

    return getInstanceById(id);
}

async function markCompleted(id, memberId) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET status = ?,
             completed_by_member_id = ?,
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [InstanceStatus.COMPLETED, memberId, id]
    );

    return getInstanceById(id);
}

// Slutför + auto-godkänn i ett steg (för chores utan approval-krav).
// approved_by lämnas NULL, vilket betyder "godkänd automatiskt".
async function markCompletedAndApproved(id, memberId) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET status = ?,
             completed_by_member_id = ?,
             completed_at = CURRENT_TIMESTAMP,
             approved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [InstanceStatus.APPROVED, memberId, id]
    );

    return getInstanceById(id);
}

async function approveInstance(id, approverMemberId) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET status = ?,
             approved_by_member_id = ?,
             approved_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [InstanceStatus.APPROVED, approverMemberId, id]
    );

    return getInstanceById(id);
}

async function rejectInstance(id, rejecterMemberId, reason) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET status = ?,
             rejected_by_member_id = ?,
             rejected_at = CURRENT_TIMESTAMP,
             rejection_reason = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [InstanceStatus.REJECTED, rejecterMemberId, reason, id]
    );

    return getInstanceById(id);
}

// Ångra en "klar": tillbaka till claimed (om någon höll i uppgiften) eller
// open. Nollställer både completion- och approval-fälten.
async function uncompleteInstance(id) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET status = CASE WHEN claimed_by_member_id IS NULL THEN ? ELSE ? END,
             completed_by_member_id = NULL,
             completed_at = NULL,
             approved_by_member_id = NULL,
             approved_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [InstanceStatus.OPEN, InstanceStatus.CLAIMED, id]
    );

    return getInstanceById(id);
}

// Friköp: uppgiften släpps fri (otilldelad) med nya, dubblade poäng.
async function buyoutInstance(id, newPoints) {
    const db = getDatabase();

    await db.run(
        `UPDATE chore_instances
         SET points = ?,
             assigned_to_member_id = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newPoints, id]
    );

    return getInstanceById(id);
}

async function updateInstanceFields(id, patch) {
    const db = getDatabase();

    const assignments = [];
    const params = [];

    if (patch.dueDate !== undefined) {
        assignments.push("due_date = ?");
        params.push(patch.dueDate);
    }

    if (patch.assignedToMemberId !== undefined) {
        assignments.push("assigned_to_member_id = ?");
        params.push(patch.assignedToMemberId);
    }

    if (assignments.length > 0) {
        assignments.push("updated_at = CURRENT_TIMESTAMP");
        params.push(id);

        await db.run(
            `UPDATE chore_instances
             SET ${assignments.join(", ")}
             WHERE id = ?`,
            params
        );
    }

    return getInstanceById(id);
}

async function deleteInstance(id) {
    const db = getDatabase();

    await db.run(
        `DELETE FROM chore_instances
         WHERE id = ?`,
        [id]
    );
}

module.exports = {
    createInstance,
    getInstanceById,
    getInstancesForHousehold,
    getInstancesForChoreInRange,
    getLastInstanceForChore,
    getLastInstanceOnOrBefore,
    getLastAssignedInstanceForChore,
    claimInstance,
    unclaimInstance,
    markCompleted,
    markCompletedAndApproved,
    approveInstance,
    rejectInstance,
    uncompleteInstance,
    buyoutInstance,
    updateInstanceFields,
    deleteInstance
};

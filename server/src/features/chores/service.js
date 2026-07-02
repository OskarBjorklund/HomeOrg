const model = require("./model");
const validation = require("./validation");
const ApiError = require("../../errors/ApiError");
const { AssignmentMode, ChoreManagerRoles } = require("./constants");

function requireManager(member) {
    if (!ChoreManagerRoles.includes(member.role)) {
        throw new ApiError(403, "You do not have permission to manage chores.");
    }
}

async function assertMembersBelongToHousehold(householdId, memberIds) {
    if (!memberIds || memberIds.length === 0) {
        return;
    }

    const validIds = new Set(await model.getMemberIdsForHousehold(householdId));

    for (const memberId of memberIds) {
        if (!validIds.has(memberId)) {
            throw new ApiError(400, "One or more assigned members are not in this household.");
        }
    }
}

// Hämtar en chore och säkerställer att den tillhör medlemmens hushåll.
// Barn får inte se templates som inte är synliga för barn.
async function getOwnedChore(member, choreId) {
    const chore = await model.getChoreById(choreId);

    if (!chore || chore.householdId !== member.household_id || chore.isActive !== 1) {
        throw new ApiError(404, "Chore not found.");
    }

    if (member.is_child_account && chore.visibleToChildren !== 1) {
        throw new ApiError(404, "Chore not found.");
    }

    return chore;
}

async function withAssignments(chore) {
    const assignedMemberIds = await model.getAssignedMemberIds(chore.id);

    return { ...chore, assignedMemberIds };
}

async function createChore(context, body) {
    const { user, member } = context;

    requireManager(member);

    const data = validation.validateCreateChore(body);

    if (data.assignmentMode === AssignmentMode.SPECIFIC) {
        await assertMembersBelongToHousehold(member.household_id, data.assignedMemberIds);
    }

    const chore = await model.createChore({
        householdId: member.household_id,
        createdByUserId: user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        icon: data.icon,
        color: data.color,
        points: data.points,
        difficulty: data.difficulty,
        estimatedMinutes: data.estimatedMinutes,
        recurrenceType: data.recurrenceType,
        recurrenceInterval: data.recurrenceInterval,
        priority: data.priority,
        assignmentMode: data.assignmentMode,
        visibleToChildren: data.visibleToChildren,
        requiresApproval: data.requiresApproval
    });

    if (data.assignmentMode === AssignmentMode.SPECIFIC && data.assignedMemberIds) {
        await model.replaceAssignments(chore.id, data.assignedMemberIds);
    }

    return withAssignments(chore);
}

async function getChores(context, query) {
    const { member } = context;

    const filters = validation.validateListFilters(query);

    return model.getChoresForHousehold({
        householdId: member.household_id,
        includeArchived: filters.includeArchived,
        onlyVisibleToChildren: Boolean(member.is_child_account)
    });
}

async function getChore(context, choreId) {
    const { member } = context;

    const id = validation.validateId(choreId, "chore id");
    const chore = await getOwnedChore(member, id);

    return withAssignments(chore);
}

async function updateChore(context, choreId, body) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(choreId, "chore id");
    const existing = await getOwnedChore(member, id);

    const { patch, assignedMemberIds } = validation.validateUpdateChore(body);

    const effectiveMode =
        patch.assignmentMode !== undefined ? patch.assignmentMode : existing.assignmentMode;

    if (assignedMemberIds !== undefined && effectiveMode === AssignmentMode.SPECIFIC) {
        if (assignedMemberIds.length === 0) {
            throw new ApiError(
                400,
                "assignedMemberIds cannot be empty when assignment mode is specific."
            );
        }

        await assertMembersBelongToHousehold(member.household_id, assignedMemberIds);
    }

    const chore = await model.updateChore(id, patch);

    // Assignments gäller bara i läget "specific"; annars nollställs de.
    if (effectiveMode === AssignmentMode.SPECIFIC) {
        if (assignedMemberIds !== undefined) {
            await model.replaceAssignments(id, assignedMemberIds);
        }
    } else if (patch.assignmentMode !== undefined) {
        await model.replaceAssignments(id, []);
    }

    return withAssignments(chore);
}

async function archiveChore(context, choreId, isArchived) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(choreId, "chore id");
    await getOwnedChore(member, id);

    const chore = await model.setArchived(id, isArchived);

    return withAssignments(chore);
}

async function deleteChore(context, choreId) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(choreId, "chore id");
    await getOwnedChore(member, id);

    await model.deleteChore(id);
}

module.exports = {
    createChore,
    getChores,
    getChore,
    updateChore,
    archiveChore,
    deleteChore
};

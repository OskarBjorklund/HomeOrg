const dayjs = require("dayjs");
const model = require("./model");
const validation = require("./validation");
const choresModel = require("../chores/model");
const pointsService = require("../points/service");
const ApiError = require("../../errors/ApiError");
const { withTransaction } = require("../../database/database");
const { AssignmentMode, RecurrenceType, ChoreManagerRoles } = require("../chores/constants");
const { LedgerReason } = require("../points/constants");
const {
    InstanceStatus,
    CompletableStatuses,
    Limits,
    DATE_FORMAT
} = require("./constants");

function isManager(member) {
    return ChoreManagerRoles.includes(member.role);
}

function requireManager(member) {
    if (!isManager(member)) {
        throw new ApiError(403, "You do not have permission to manage chore instances.");
    }
}

// Hämtar en instans och säkerställer att den tillhör medlemmens hushåll.
// Barn ser inte instanser vars template är dold för barn.
async function getOwnedInstance(member, instanceId) {
    const instance = await model.getInstanceById(instanceId);

    if (!instance || instance.householdId !== member.household_id) {
        throw new ApiError(404, "Chore instance not found.");
    }

    if (member.is_child_account && instance.choreVisibleToChildren !== 1) {
        throw new ApiError(404, "Chore instance not found.");
    }

    return instance;
}

async function assertMemberInHousehold(householdId, memberId) {
    const validIds = await choresModel.getMemberIdsForHousehold(householdId);

    if (!validIds.includes(memberId)) {
        throw new ApiError(400, "Member is not in this household.");
    }
}

// Snapshot: instansen fryser templatens värden vid skapandet, så att
// senare ändringar i templaten inte skriver om historiken.
function snapshotFromChore(chore, { dueDate, assignedToMemberId }) {
    return {
        choreId: chore.id,
        householdId: chore.householdId,
        title: chore.title,
        description: chore.description,
        category: chore.category,
        icon: chore.icon,
        color: chore.color,
        points: chore.points,
        difficulty: chore.difficulty,
        estimatedMinutes: chore.estimatedMinutes,
        priority: chore.priority,
        requiresApproval: chore.requiresApproval === 1,
        dueDate,
        assignedToMemberId: assignedToMemberId || null
    };
}

async function getUsableChore(member, choreId) {
    const chore = await choresModel.getChoreById(choreId);

    if (!chore || chore.householdId !== member.household_id || chore.isActive !== 1) {
        throw new ApiError(404, "Chore not found.");
    }

    if (chore.isArchived === 1) {
        throw new ApiError(400, "Cannot create instances of an archived chore.");
    }

    return chore;
}

async function createInstance(context, body) {
    const { member } = context;

    requireManager(member);

    const data = validation.validateCreateInstance(body);
    const chore = await getUsableChore(member, data.choreId);

    if (data.assignedToMemberId) {
        await assertMemberInHousehold(member.household_id, data.assignedToMemberId);
    }

    return model.createInstance(
        snapshotFromChore(chore, {
            dueDate: data.dueDate,
            assignedToMemberId: data.assignedToMemberId
        })
    );
}

function stepDate(date, chore) {
    const interval = chore.recurrenceInterval || 1;

    if (chore.recurrenceType === RecurrenceType.DAILY) {
        return date.add(interval, "day");
    }

    if (chore.recurrenceType === RecurrenceType.WEEKLY) {
        return date.add(interval * 7, "day");
    }

    // MONTHLY — dayjs hanterar månadsslut (31 jan + 1 mån = 28/29 feb).
    return date.add(interval, "month");
}

// Genererar instanser för en återkommande chore fram till "until".
// Ankare: senaste befintliga instansens due_date; annars startar vi idag.
// Datum i det förflutna hoppas över (ingen retroaktiv skuld).
async function generateForChore(chore, { today, until }) {
    const existing = await model.getInstancesForChoreInRange(chore.id, today, until);

    const existingDates = new Set(existing.map((row) => row.dueDate));
    const existingPairs = new Set(
        existing.map((row) => `${row.dueDate}:${row.assignedToMemberId}`)
    );

    const last = await model.getLastInstanceForChore(chore.id);

    let candidate = last ? stepDate(dayjs(last.dueDate), chore) : dayjs(today);
    let guard = 0;

    // Spola fram förbi passerade datum.
    while (candidate.isBefore(dayjs(today)) && guard < Limits.GENERATION_LOOP_CAP) {
        candidate = stepDate(candidate, chore);
        guard++;
    }

    const usesPool =
        chore.assignmentMode === AssignmentMode.SPECIFIC ||
        chore.assignmentMode === AssignmentMode.ROTATION;

    const pool = usesPool ? await choresModel.getAssignedMemberIds(chore.id) : [];

    // Rotation fortsätter där den slutade: nästa medlem efter senast tilldelade.
    let rotationIndex = 0;

    if (chore.assignmentMode === AssignmentMode.ROTATION && pool.length > 0) {
        const lastAssigned = await model.getLastAssignedInstanceForChore(chore.id);
        const lastIndex = lastAssigned ? pool.indexOf(lastAssigned.assignedToMemberId) : -1;
        rotationIndex = lastIndex === -1 ? 0 : lastIndex + 1;
    }

    let created = 0;

    while (!candidate.isAfter(dayjs(until)) && guard < Limits.GENERATION_LOOP_CAP) {
        const dueDate = candidate.format(DATE_FORMAT);

        if (chore.assignmentMode === AssignmentMode.SPECIFIC && pool.length > 0) {
            // En instans per tilldelad medlem och datum.
            for (const memberId of pool) {
                if (!existingPairs.has(`${dueDate}:${memberId}`)) {
                    await model.createInstance(
                        snapshotFromChore(chore, { dueDate, assignedToMemberId: memberId })
                    );
                    created++;
                }
            }
        } else if (chore.assignmentMode === AssignmentMode.ROTATION && pool.length > 0) {
            if (!existingDates.has(dueDate)) {
                const memberId = pool[rotationIndex % pool.length];
                rotationIndex++;

                await model.createInstance(
                    snapshotFromChore(chore, { dueDate, assignedToMemberId: memberId })
                );
                created++;
            }
        } else if (!existingDates.has(dueDate)) {
            await model.createInstance(
                snapshotFromChore(chore, { dueDate, assignedToMemberId: null })
            );
            created++;
        }

        candidate = stepDate(candidate, chore);
        guard++;
    }

    return created;
}

// Körs manuellt via POST /generate under utveckling.
// Samma funktion är tänkt att anropas av en schemalagd bakgrundsprocess
// när appen blir en riktig produkt — logiken är medvetet fri från HTTP.
async function generateRecurring(context, body) {
    const { member } = context;

    requireManager(member);

    const { daysAhead } = validation.validateGenerate(body);

    const today = dayjs().format(DATE_FORMAT);
    const until = dayjs().add(daysAhead, "day").format(DATE_FORMAT);

    const chores = await choresModel.getChoresForHousehold({
        householdId: member.household_id,
        includeArchived: false,
        onlyVisibleToChildren: false
    });

    const recurring = chores.filter(
        (chore) => chore.recurrenceType !== RecurrenceType.NONE
    );

    return withTransaction(async () => {
        let created = 0;

        for (const chore of recurring) {
            created += await generateForChore(chore, { today, until });
        }

        return { created, from: today, to: until };
    });
}

async function getInstances(context, query) {
    const { member } = context;

    const filters = validation.validateListFilters(query);

    return model.getInstancesForHousehold({
        householdId: member.household_id,
        status: filters.status,
        choreId: filters.choreId,
        assignedToMemberId: filters.assignedToMemberId,
        from: filters.from,
        to: filters.to,
        onlyVisibleToChildren: Boolean(member.is_child_account)
    });
}

async function getInstance(context, instanceId) {
    const { member } = context;

    const id = validation.validateId(instanceId, "instance id");

    return getOwnedInstance(member, id);
}

async function claimInstance(context, instanceId) {
    const { member } = context;

    const id = validation.validateId(instanceId, "instance id");
    const instance = await getOwnedInstance(member, id);

    if (instance.status !== InstanceStatus.OPEN) {
        throw new ApiError(400, "Only open instances can be claimed.");
    }

    if (instance.assignedToMemberId) {
        throw new ApiError(400, "This instance is already assigned to a member.");
    }

    return model.claimInstance(id, member.id);
}

async function unclaimInstance(context, instanceId) {
    const { member } = context;

    const id = validation.validateId(instanceId, "instance id");
    const instance = await getOwnedInstance(member, id);

    if (instance.status !== InstanceStatus.CLAIMED) {
        throw new ApiError(400, "Only claimed instances can be unclaimed.");
    }

    if (instance.claimedByMemberId !== member.id && !isManager(member)) {
        throw new ApiError(403, "Only the member who claimed this instance can unclaim it.");
    }

    return model.unclaimInstance(id);
}

// Tilldelad/claimad instans: bara den medlemmen (eller manager) får slutföra.
// Otilldelad och oclaimad: vem som helst i hushållet.
function assertCanComplete(member, instance) {
    if (isManager(member)) {
        return;
    }

    if (instance.assignedToMemberId) {
        if (instance.assignedToMemberId !== member.id) {
            throw new ApiError(403, "This instance is assigned to another member.");
        }

        return;
    }

    if (instance.claimedByMemberId && instance.claimedByMemberId !== member.id) {
        throw new ApiError(403, "This instance is claimed by another member.");
    }
}

async function completeInstance(context, instanceId) {
    const { member } = context;

    const id = validation.validateId(instanceId, "instance id");
    const instance = await getOwnedInstance(member, id);

    if (!CompletableStatuses.includes(instance.status)) {
        throw new ApiError(400, `Cannot complete an instance with status '${instance.status}'.`);
    }

    assertCanComplete(member, instance);

    if (instance.requiresApproval === 1) {
        return model.markCompleted(id, member.id);
    }

    // Ingen approval krävs: slutför, auto-godkänn och ge poäng atomärt.
    return withTransaction(async () => {
        const updated = await model.markCompletedAndApproved(id, member.id);

        if (updated.points > 0) {
            await pointsService.addPoints({
                householdId: updated.householdId,
                memberId: member.id,
                amount: updated.points,
                reason: LedgerReason.CHORE_APPROVED,
                choreInstanceId: updated.id
            });
        }

        return updated;
    });
}

async function approveInstance(context, instanceId) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(instanceId, "instance id");
    const instance = await getOwnedInstance(member, id);

    if (instance.status !== InstanceStatus.COMPLETED) {
        throw new ApiError(400, "Only completed instances can be approved.");
    }

    return withTransaction(async () => {
        const updated = await model.approveInstance(id, member.id);

        if (updated.points > 0 && updated.completedByMemberId) {
            await pointsService.addPoints({
                householdId: updated.householdId,
                memberId: updated.completedByMemberId,
                amount: updated.points,
                reason: LedgerReason.CHORE_APPROVED,
                choreInstanceId: updated.id
            });
        }

        return updated;
    });
}

async function rejectInstance(context, instanceId, body) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(instanceId, "instance id");
    const instance = await getOwnedInstance(member, id);

    if (instance.status !== InstanceStatus.COMPLETED) {
        throw new ApiError(400, "Only completed instances can be rejected.");
    }

    const { reason } = validation.validateReject(body);

    return model.rejectInstance(id, member.id, reason);
}

async function updateInstance(context, instanceId, body) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(instanceId, "instance id");
    const instance = await getOwnedInstance(member, id);

    if (instance.status !== InstanceStatus.OPEN) {
        throw new ApiError(400, "Only open instances can be updated.");
    }

    const patch = validation.validateUpdateInstance(body);

    if (patch.assignedToMemberId !== undefined && patch.assignedToMemberId !== null) {
        await assertMemberInHousehold(member.household_id, patch.assignedToMemberId);
    }

    return model.updateInstanceFields(id, patch);
}

async function deleteInstance(context, instanceId) {
    const { member } = context;

    requireManager(member);

    const id = validation.validateId(instanceId, "instance id");
    const instance = await getOwnedInstance(member, id);

    // Godkända instanser har delat ut poäng — de är historik och får inte raderas.
    if (instance.status === InstanceStatus.APPROVED) {
        throw new ApiError(400, "Approved instances cannot be deleted.");
    }

    await model.deleteInstance(id);
}

module.exports = {
    createInstance,
    generateRecurring,
    getInstances,
    getInstance,
    claimInstance,
    unclaimInstance,
    completeInstance,
    approveInstance,
    rejectInstance,
    updateInstance,
    deleteInstance
};

const dayjs = require("dayjs");
const validation = require("./validation");
const instancesModel = require("../choreInstances/model");
const instancesService = require("../choreInstances/service");
const choresModel = require("../chores/model");
const ApiError = require("../../errors/ApiError");
const { withTransaction } = require("../../database/database");
const { RecurrenceType } = require("../chores/constants");
const { DATE_FORMAT } = require("../choreInstances/constants");
const { ItemType, Limits } = require("./constants");

function toProjectionItem(chore, dueDate) {
    return {
        type: ItemType.PROJECTION,
        choreId: chore.id,
        dueDate,
        title: chore.title,
        description: chore.description,
        category: chore.category,
        icon: chore.icon,
        color: chore.color,
        points: chore.points,
        difficulty: chore.difficulty,
        estimatedMinutes: chore.estimatedMinutes,
        priority: chore.priority,
        requiresApproval: chore.requiresApproval,
        assignmentMode: chore.assignmentMode,
        recurrenceType: chore.recurrenceType,
        recurrenceInterval: chore.recurrenceInterval
    };
}

function toInstanceItem(instance) {
    return { type: ItemType.INSTANCE, ...instance };
}

// Beräknar kommande förekomster av en återkommande chore i [from, to]
// som ännu inte har någon instans. Rent läsande — inget skapas.
async function projectChore(chore, { today, from, to }) {
    const startDate = await instancesService.getOccurrenceStartDate(chore, today);

    const dates = instancesService.computeOccurrenceDates(chore, {
        startDate,
        from,
        to
    });

    if (dates.length === 0) {
        return [];
    }

    const existing = await instancesModel.getInstancesForChoreInRange(chore.id, from, to);
    const existingDates = new Set(existing.map((row) => row.dueDate));

    return dates
        .filter((dueDate) => !existingDates.has(dueDate))
        .map((dueDate) => toProjectionItem(chore, dueDate));
}

async function getCalendar(context, query) {
    const { member } = context;

    const { from, to } = validation.validateCalendarQuery(query);

    const householdId = member.household_id;
    const onlyVisibleToChildren = Boolean(member.is_child_account);
    const today = dayjs().format(DATE_FORMAT);

    // Alla riktiga instanser i intervallet, oavsett status —
    // kalendern visar även avklarad historik.
    const instances = await instancesModel.getInstancesForHousehold({
        householdId,
        from,
        to,
        onlyVisibleToChildren
    });

    // Projektioner endast framåt i tiden: från och med idag.
    const projectionFrom = dayjs(from).isBefore(dayjs(today)) ? today : from;

    let projections = [];

    if (!dayjs(projectionFrom).isAfter(dayjs(to))) {
        const chores = await choresModel.getChoresForHousehold({
            householdId,
            includeArchived: false,
            onlyVisibleToChildren
        });

        const recurring = chores.filter(
            (chore) => chore.recurrenceType !== RecurrenceType.NONE
        );

        for (const chore of recurring) {
            const items = await projectChore(chore, {
                today,
                from: projectionFrom,
                to
            });

            projections = projections.concat(items);
        }
    }

    // Gruppera per dag (glest: bara dagar med innehåll).
    const dayMap = new Map();

    function addItem(date, item) {
        if (!dayMap.has(date)) {
            dayMap.set(date, { date, items: [] });
        }

        dayMap.get(date).items.push(item);
    }

    for (const instance of instances) {
        addItem(instance.dueDate, toInstanceItem(instance));
    }

    for (const projection of projections) {
        addItem(projection.dueDate, projection);
    }

    const days = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    return { from, to, today, days };
}

// Gör en projicerad förekomst till riktiga instanser genom att köra samma
// generering som POST /chore-instances/generate, fast fram till valt datum.
// Det fyller även eventuella luckor på vägen — exakt vad en cron hade gjort —
// och bevarar rotationsordningen. Alla medlemmar får materialisera synliga
// chores: de kan bara skapa det som schemat redan föreskriver.
async function materializeOccurrence(context, body) {
    const { member } = context;

    const { choreId, dueDate } = validation.validateMaterialize(body);

    const chore = await choresModel.getChoreById(choreId);

    if (!chore || chore.householdId !== member.household_id || chore.isActive !== 1) {
        throw new ApiError(404, "Chore not found.");
    }

    if (member.is_child_account && chore.visibleToChildren !== 1) {
        throw new ApiError(404, "Chore not found.");
    }

    if (chore.isArchived === 1) {
        throw new ApiError(400, "Cannot materialize an archived chore.");
    }

    if (chore.recurrenceType === RecurrenceType.NONE) {
        throw new ApiError(400, "Only recurring chores can be materialized.");
    }

    const today = dayjs().format(DATE_FORMAT);

    if (dayjs(dueDate).isBefore(dayjs(today))) {
        throw new ApiError(400, "Cannot materialize a date in the past.");
    }

    if (dayjs(dueDate).diff(dayjs(today), "day") > Limits.MATERIALIZE_MAX_DAYS_AHEAD) {
        throw new ApiError(
            400,
            `Cannot materialize more than ${Limits.MATERIALIZE_MAX_DAYS_AHEAD} days ahead.`
        );
    }

    await withTransaction(async () => {
        await instancesService.generateForChore(chore, { today, until: dueDate });

        const rows = await instancesModel.getInstancesForChoreInRange(
            chore.id,
            dueDate,
            dueDate
        );

        // Inget skapades på måldatumet => datumet ingår inte i mönstret.
        // Kastet rullar tillbaka hela genereringen.
        if (rows.length === 0) {
            throw new ApiError(400, "Date is not an occurrence of this chore.");
        }
    });

    const instances = await instancesModel.getInstancesForHousehold({
        householdId: member.household_id,
        choreId: chore.id,
        from: dueDate,
        to: dueDate,
        onlyVisibleToChildren: Boolean(member.is_child_account)
    });

    return instances;
}

module.exports = {
    getCalendar,
    materializeOccurrence
};

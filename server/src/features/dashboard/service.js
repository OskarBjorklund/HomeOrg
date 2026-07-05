const dayjs = require("dayjs");
const model = require("./model");
const validation = require("./validation");
const instancesModel = require("../choreInstances/model");
const { InstanceStatus, DATE_FORMAT } = require("../choreInstances/constants");
const { ChoreManagerRoles } = require("../chores/constants");

function isManager(member) {
    return ChoreManagerRoles.includes(member.role);
}

// Dashboarden är read-only aggregering: den återanvänder choreInstances-modellens
// frågor för instanslistor och har egen SQL endast för sammanställningar
// (medlemsöversikt, räknare). Ingen egen affärslogik som ändrar data.
async function getDashboard(context, query) {
    const { member } = context;

    const { upcomingDays } = validation.validateDashboardQuery(query);

    const householdId = member.household_id;
    const onlyVisibleToChildren = Boolean(member.is_child_account);

    const today = dayjs().format(DATE_FORMAT);
    const yesterday = dayjs().subtract(1, "day").format(DATE_FORMAT);
    const tomorrow = dayjs().add(1, "day").format(DATE_FORMAT);
    const until = dayjs().add(upcomingDays, "day").format(DATE_FORMAT);

    const activeStatuses = [InstanceStatus.OPEN, InstanceStatus.CLAIMED];

    const [overdue, dueToday, upcoming, members, stats] = await Promise.all([
        instancesModel.getInstancesForHousehold({
            householdId,
            statuses: activeStatuses,
            to: yesterday,
            onlyVisibleToChildren
        }),
        instancesModel.getInstancesForHousehold({
            householdId,
            statuses: activeStatuses,
            from: today,
            to: today,
            onlyVisibleToChildren
        }),
        instancesModel.getInstancesForHousehold({
            householdId,
            statuses: activeStatuses,
            from: tomorrow,
            to: until,
            onlyVisibleToChildren
        }),
        model.getMembersSummary(householdId),
        model.getInstanceStats(householdId, today)
    ]);

    // Approval är en manager-åtgärd; själva listan visas bara för managers.
    // Antalet (stats.pendingApproval) är synligt för alla.
    const pendingApprovals = isManager(member)
        ? await instancesModel.getInstancesForHousehold({
              householdId,
              status: InstanceStatus.COMPLETED,
              onlyVisibleToChildren: false
          })
        : [];

    return {
        date: today,
        upcomingDays,
        overdue,
        today: dueToday,
        upcoming,
        pendingApprovals,
        members,
        stats
    };
}

module.exports = {
    getDashboard
};

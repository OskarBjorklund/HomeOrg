const model = require("./model");
const validation = require("./validation");
const achievementsService = require("../achievements/service");
const ApiError = require("../../errors/ApiError");
const { withTransaction } = require("../../database/database");
const { LedgerReason, PointsManagerRoles, Limits } = require("./constants");

function isManager(member) {
    return PointsManagerRoles.includes(member.role);
}

// Detta är det ENDA stället i appen som får ändra poängsaldon.
// Andra moduler (choreInstances, shop, ...) importerar addPoints och skickar
// alltid med en reason + koppling till källan (t.ex. choreInstanceId), så att
// points_ledger alltid förklarar hela saldot.
//
// Är poäng avstängda i hushållets inställningar blir anropet en tyst no-op
// (returnerar null) — flöden som chore-slutförande ska inte krascha av det.
//
// OBS: addPoints öppnar INGEN egen transaktion. Ingår anropet i ett större
// flöde (t.ex. "godkänn chore + ge poäng") ansvarar anroparen för att köra
// allt inom withTransaction så att ledger, saldo och statusändring är atomära.
async function addPoints({
    householdId,
    memberId,
    amount,
    reason,
    note = null,
    choreInstanceId = null,
    shopPurchaseId = null,
    actorMemberId = null
}) {
    if (!Number.isInteger(amount) || amount === 0) {
        throw new ApiError(400, "Points amount must be a non-zero integer.");
    }

    if (!Object.values(LedgerReason).includes(reason)) {
        throw new ApiError(400, "Invalid points ledger reason.");
    }

    const enabled = await model.getPointsEnabled(householdId);

    if (!enabled) {
        return null;
    }

    await model.insertLedgerEntry({
        householdId,
        memberId,
        amount,
        reason,
        note,
        choreInstanceId,
        shopPurchaseId,
        createdByMemberId: actorMemberId
    });

    await model.addToMemberBalance(memberId, amount);

    return model.getBalanceForMember(memberId);
}

// Manuell justering av en manager, positiv eller negativ.
// Saldot får inte bli negativt.
async function adjustPoints(context, body) {
    const { member } = context;

    if (!isManager(member)) {
        throw new ApiError(403, "You do not have permission to adjust points.");
    }

    const { memberId, amount, note } = validation.validateAdjust(body);

    const target = await model.getMemberInHousehold(memberId, member.household_id);

    if (!target) {
        throw new ApiError(400, "Member is not in this household.");
    }

    const enabled = await model.getPointsEnabled(member.household_id);

    if (!enabled) {
        throw new ApiError(400, "Points are disabled for this household.");
    }

    return withTransaction(async () => {
        if (amount < 0) {
            const balance = await model.getBalanceForMember(memberId);

            if (balance + amount < 0) {
                throw new ApiError(400, "Adjustment would make the balance negative.");
            }
        }

        const balance = await addPoints({
            householdId: member.household_id,
            memberId,
            amount,
            reason: LedgerReason.MANUAL_ADJUSTMENT,
            note,
            actorMemberId: member.id
        });

        // Positiva justeringar räknas som intjänat och kan låsa upp
        // poäng-achievements.
        if (amount > 0) {
            await achievementsService.syncMemberAchievements({
                householdId: member.household_id,
                memberId
            });
        }

        return { memberId, amount, note, balance };
    });
}

async function getLedger(context, query) {
    const { member } = context;

    const filters = validation.validateLedgerQuery(query);

    const householdFilters = {
        householdId: member.household_id,
        memberId: filters.memberId,
        reason: filters.reason,
        from: filters.from,
        to: filters.to,
        limit: filters.limit,
        offset: filters.offset
    };

    const [entries, total] = await Promise.all([
        model.getLedgerForHousehold(householdFilters),
        model.countLedgerForHousehold(householdFilters)
    ]);

    return {
        entries,
        pagination: {
            limit: filters.limit,
            offset: filters.offset,
            total
        }
    };
}

// Per medlem: saldo, intjänat, spenderat. Grunden för leaderboarden.
async function getSummary(context) {
    const { member } = context;

    return model.getSummaryForHousehold(member.household_id);
}

async function getMyPoints(context) {
    const { member } = context;

    const [balance, recent] = await Promise.all([
        model.getBalanceForMember(member.id),
        model.getLedgerForHousehold({
            householdId: member.household_id,
            memberId: member.id,
            limit: Limits.RECENT_ENTRIES,
            offset: 0
        })
    ]);

    return { balance, recent };
}

module.exports = {
    addPoints,
    adjustPoints,
    getLedger,
    getSummary,
    getMyPoints
};

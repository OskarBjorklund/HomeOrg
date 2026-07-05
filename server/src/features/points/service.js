const model = require("./model");
const ApiError = require("../../errors/ApiError");
const { LedgerReason } = require("./constants");

// Detta är det ENDA stället i appen som får ändra poängsaldon.
// Andra moduler (choreInstances, shop, ...) importerar addPoints och skickar
// alltid med en reason + koppling till källan (t.ex. choreInstanceId), så att
// points_ledger alltid förklarar hela saldot.
//
// OBS: addPoints öppnar INGEN egen transaktion. Ingår anropet i ett större
// flöde (t.ex. "godkänn chore + ge poäng") ansvarar anroparen för att köra
// allt inom withTransaction så att ledger, saldo och statusändring är atomära.
async function addPoints({
    householdId,
    memberId,
    amount,
    reason,
    choreInstanceId = null,
    shopPurchaseId = null
}) {
    if (!Number.isInteger(amount) || amount === 0) {
        throw new ApiError(400, "Points amount must be a non-zero integer.");
    }

    if (!Object.values(LedgerReason).includes(reason)) {
        throw new ApiError(400, "Invalid points ledger reason.");
    }

    await model.insertLedgerEntry({
        householdId,
        memberId,
        amount,
        reason,
        choreInstanceId,
        shopPurchaseId
    });

    await model.addToMemberBalance(memberId, amount);

    return model.getBalanceForMember(memberId);
}

module.exports = {
    addPoints
};

const ApiError = require("../../errors/ApiError");
const {
    isPlainObject,
    validateId,
    optionalDate,
    optionalTrimmedString,
    optionalEnum,
    optionalInteger
} = require("../../utils/validate");
const { LedgerReason, Limits } = require("./constants");

function validateAdjust(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const memberId = validateId(body.memberId, "member id");

    const amount = Number(body.amount);

    if (!Number.isInteger(amount) || amount === 0) {
        throw new ApiError(400, "Amount must be a non-zero integer.");
    }

    if (Math.abs(amount) > Limits.ADJUST_MAX) {
        throw new ApiError(400, `Amount must be between -${Limits.ADJUST_MAX} and ${Limits.ADJUST_MAX}.`);
    }

    const note = optionalTrimmedString(body.note, "Note", Limits.NOTE_MAX);

    return { memberId, amount, note };
}

function validateLedgerQuery(query) {
    const memberId =
        query?.memberId !== undefined && query.memberId !== ""
            ? validateId(query.memberId, "member id")
            : null;

    const reason = optionalEnum(query?.reason, LedgerReason, "reason");

    const from = optionalDate(query?.from, "from");
    const to = optionalDate(query?.to, "to");

    const limit =
        optionalInteger(query?.limit, "limit", { min: 1, max: Limits.LEDGER_PAGE_MAX }) ??
        Limits.LEDGER_PAGE_DEFAULT;

    const offset = optionalInteger(query?.offset, "offset", { min: 0 }) ?? 0;

    return { memberId, reason, from, to, limit, offset };
}

module.exports = {
    validateAdjust,
    validateLedgerQuery
};

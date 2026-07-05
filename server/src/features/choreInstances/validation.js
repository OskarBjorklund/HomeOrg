const ApiError = require("../../errors/ApiError");
const {
    isPlainObject,
    validateId,
    requiredDate,
    optionalDate,
    optionalTrimmedString,
    optionalEnum
} = require("../../utils/validate");
const { InstanceStatus, Defaults, Limits } = require("./constants");

function validateCreateInstance(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const choreId = validateId(body.choreId, "chore id");
    const dueDate = requiredDate(body.dueDate, "Due date");

    let assignedToMemberId = null;

    if (body.assignedToMemberId !== undefined && body.assignedToMemberId !== null) {
        assignedToMemberId = validateId(body.assignedToMemberId, "member id");
    }

    return { choreId, dueDate, assignedToMemberId };
}

function validateGenerate(body) {
    let daysAhead = Defaults.GENERATE_DAYS_AHEAD;

    if (isPlainObject(body) && body.daysAhead !== undefined && body.daysAhead !== null) {
        const number = Number(body.daysAhead);

        if (!Number.isInteger(number) || number < 1 || number > Limits.GENERATE_DAYS_MAX) {
            throw new ApiError(
                400,
                `daysAhead must be an integer between 1 and ${Limits.GENERATE_DAYS_MAX}.`
            );
        }

        daysAhead = number;
    }

    return { daysAhead };
}

function validateListFilters(query) {
    const filters = {
        status: optionalEnum(query?.status, InstanceStatus, "status filter"),
        choreId: null,
        assignedToMemberId: null,
        from: optionalDate(query?.from, "from"),
        to: optionalDate(query?.to, "to")
    };

    if (query?.choreId !== undefined && query.choreId !== "") {
        filters.choreId = validateId(query.choreId, "chore id");
    }

    if (query?.assignedToMemberId !== undefined && query.assignedToMemberId !== "") {
        filters.assignedToMemberId = validateId(query.assignedToMemberId, "member id");
    }

    return filters;
}

function validateUpdateInstance(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const patch = {};

    if (body.dueDate !== undefined) {
        patch.dueDate = requiredDate(body.dueDate, "Due date");
    }

    if (body.assignedToMemberId !== undefined) {
        patch.assignedToMemberId =
            body.assignedToMemberId === null
                ? null
                : validateId(body.assignedToMemberId, "member id");
    }

    if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "No valid fields to update.");
    }

    return patch;
}

function validateReject(body) {
    const reason = isPlainObject(body)
        ? optionalTrimmedString(body.reason, "Reason", Limits.REJECTION_REASON_MAX)
        : null;

    return { reason };
}

module.exports = {
    validateId,
    validateCreateInstance,
    validateGenerate,
    validateListFilters,
    validateUpdateInstance,
    validateReject
};

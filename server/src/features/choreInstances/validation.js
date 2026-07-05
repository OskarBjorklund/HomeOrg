const dayjs = require("dayjs");
const ApiError = require("../../errors/ApiError");
const { InstanceStatus, Defaults, Limits, DATE_FORMAT } = require("./constants");

function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateId(value, field = "id") {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        throw new ApiError(400, `A valid ${field} is required.`);
    }

    return number;
}

function requiredDate(value, field) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new ApiError(400, `${field} must be a date in ${DATE_FORMAT} format.`);
    }

    const parsed = dayjs(value);

    // Rundturskontrollen fångar ogiltiga datum som 2026-02-31.
    if (!parsed.isValid() || parsed.format(DATE_FORMAT) !== value) {
        throw new ApiError(400, `${field} is not a valid date.`);
    }

    return value;
}

function optionalDate(value, field) {
    if (value === undefined || value === null) {
        return null;
    }

    return requiredDate(value, field);
}

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
        status: null,
        choreId: null,
        assignedToMemberId: null,
        from: null,
        to: null
    };

    if (query?.status !== undefined && query.status !== "") {
        if (!Object.values(InstanceStatus).includes(query.status)) {
            throw new ApiError(400, "Invalid status filter.");
        }

        filters.status = query.status;
    }

    if (query?.choreId !== undefined && query.choreId !== "") {
        filters.choreId = validateId(query.choreId, "chore id");
    }

    if (query?.assignedToMemberId !== undefined && query.assignedToMemberId !== "") {
        filters.assignedToMemberId = validateId(query.assignedToMemberId, "member id");
    }

    filters.from = optionalDate(query?.from === "" ? null : query?.from, "from");
    filters.to = optionalDate(query?.to === "" ? null : query?.to, "to");

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
    let reason = null;

    if (isPlainObject(body) && body.reason !== undefined && body.reason !== null) {
        if (typeof body.reason !== "string") {
            throw new ApiError(400, "Reason must be a string.");
        }

        reason = body.reason.trim() || null;

        if (reason && reason.length > Limits.REJECTION_REASON_MAX) {
            throw new ApiError(
                400,
                `Reason must be at most ${Limits.REJECTION_REASON_MAX} characters.`
            );
        }
    }

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

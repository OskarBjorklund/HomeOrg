const dayjs = require("dayjs");
const ApiError = require("../../errors/ApiError");
const { Limits } = require("./constants");
const { DATE_FORMAT } = require("../choreInstances/constants");

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

    if (!parsed.isValid() || parsed.format(DATE_FORMAT) !== value) {
        throw new ApiError(400, `${field} is not a valid date.`);
    }

    return value;
}

// Default: innevarande månad. Explicit from/to för valfri vy (max 92 dagar).
function validateCalendarQuery(query) {
    const from =
        query?.from !== undefined && query.from !== ""
            ? requiredDate(query.from, "from")
            : dayjs().startOf("month").format(DATE_FORMAT);

    const to =
        query?.to !== undefined && query.to !== ""
            ? requiredDate(query.to, "to")
            : dayjs().endOf("month").format(DATE_FORMAT);

    if (dayjs(from).isAfter(dayjs(to))) {
        throw new ApiError(400, "from must be on or before to.");
    }

    if (dayjs(to).diff(dayjs(from), "day") > Limits.RANGE_MAX_DAYS) {
        throw new ApiError(
            400,
            `Calendar range must be at most ${Limits.RANGE_MAX_DAYS} days.`
        );
    }

    return { from, to };
}

function validateMaterialize(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const choreId = validateId(body.choreId, "chore id");
    const dueDate = requiredDate(body.dueDate, "Due date");

    return { choreId, dueDate };
}

module.exports = {
    validateCalendarQuery,
    validateMaterialize
};

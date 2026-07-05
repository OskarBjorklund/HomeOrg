const dayjs = require("dayjs");
const ApiError = require("../errors/ApiError");

const DATE_FORMAT = "YYYY-MM-DD";

// Gemensamma validerings-primitiver för modulernas validation.js-filer.
// Varje modul äger fortfarande sina regler; det här är bara byggstenarna.

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
    if (value === undefined || value === null || value === "") {
        return null;
    }

    return requiredDate(value, field);
}

function requiredTrimmedString(value, field, max) {
    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(400, `${field} is required.`);
    }

    const trimmed = value.trim();

    if (max !== undefined && trimmed.length > max) {
        throw new ApiError(400, `${field} must be at most ${max} characters.`);
    }

    return trimmed;
}

function optionalTrimmedString(value, field, max) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "string") {
        throw new ApiError(400, `${field} must be a string.`);
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return null;
    }

    if (trimmed.length > max) {
        throw new ApiError(400, `${field} must be at most ${max} characters.`);
    }

    return trimmed;
}

function optionalEnum(value, allowed, field) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    if (typeof value !== "string" || !Object.values(allowed).includes(value)) {
        throw new ApiError(400, `Invalid ${field}.`);
    }

    return value;
}

function optionalInteger(value, field, { min, max } = {}) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const number = Number(value);

    if (!Number.isInteger(number)) {
        throw new ApiError(400, `${field} must be an integer.`);
    }

    if (min !== undefined && number < min) {
        throw new ApiError(400, `${field} must be at least ${min}.`);
    }

    if (max !== undefined && number > max) {
        throw new ApiError(400, `${field} must be at most ${max}.`);
    }

    return number;
}

function optionalBoolean(value, field) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "boolean") {
        throw new ApiError(400, `${field} must be a boolean.`);
    }

    return value;
}

module.exports = {
    DATE_FORMAT,
    isPlainObject,
    validateId,
    requiredDate,
    optionalDate,
    requiredTrimmedString,
    optionalTrimmedString,
    optionalEnum,
    optionalInteger,
    optionalBoolean
};

const ApiError = require("../../errors/ApiError");
const {
    RecurrenceType,
    Priority,
    Difficulty,
    AssignmentMode,
    Defaults,
    Limits
} = require("./constants");

function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredTrimmedString(value, field, max) {
    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(400, `${field} is required.`);
    }

    const trimmed = value.trim();

    if (trimmed.length > max) {
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

function optionalInteger(value, field, { min, max }) {
    if (value === undefined || value === null) {
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

function optionalEnum(value, allowed, field) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "string" || !Object.values(allowed).includes(value)) {
        throw new ApiError(400, `Invalid ${field}.`);
    }

    return value;
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

function normalizeMemberIds(value) {
    if (value === undefined || value === null) {
        return null;
    }

    if (!Array.isArray(value)) {
        throw new ApiError(400, "assignedMemberIds must be an array.");
    }

    const ids = value.map((raw) => {
        const number = Number(raw);

        if (!Number.isInteger(number) || number <= 0) {
            throw new ApiError(400, "assignedMemberIds must contain valid member ids.");
        }

        return number;
    });

    return [...new Set(ids)];
}

function validateId(value, field = "id") {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        throw new ApiError(400, `A valid ${field} is required.`);
    }

    return number;
}

function validateCreateChore(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const title = requiredTrimmedString(body.title, "Title", Limits.TITLE_MAX);

    const points = optionalInteger(body.points, "Points", {
        min: 0,
        max: Limits.POINTS_MAX
    });

    const estimatedMinutes = optionalInteger(body.estimatedMinutes, "Estimated minutes", {
        min: 1,
        max: Limits.ESTIMATED_MINUTES_MAX
    });

    const recurrenceInterval = optionalInteger(body.recurrenceInterval, "Recurrence interval", {
        min: 1,
        max: Limits.RECURRENCE_INTERVAL_MAX
    });

    const visibleToChildren = optionalBoolean(body.visibleToChildren, "visibleToChildren");
    const requiresApproval = optionalBoolean(body.requiresApproval, "requiresApproval");

    const assignmentMode =
        optionalEnum(body.assignmentMode, AssignmentMode, "assignment mode") ||
        Defaults.ASSIGNMENT_MODE;

    const assignedMemberIds = normalizeMemberIds(body.assignedMemberIds);

    if (assignmentMode === AssignmentMode.SPECIFIC) {
        if (!assignedMemberIds || assignedMemberIds.length === 0) {
            throw new ApiError(
                400,
                "assignedMemberIds is required when assignment mode is specific."
            );
        }
    }

    return {
        title,
        description: optionalTrimmedString(body.description, "Description", Limits.DESCRIPTION_MAX),
        category: optionalTrimmedString(body.category, "Category", Limits.CATEGORY_MAX),
        icon: optionalTrimmedString(body.icon, "Icon", Limits.ICON_MAX),
        color: optionalTrimmedString(body.color, "Color", Limits.COLOR_MAX),
        points: points === null ? Defaults.POINTS : points,
        difficulty: optionalEnum(body.difficulty, Difficulty, "difficulty"),
        estimatedMinutes,
        recurrenceType:
            optionalEnum(body.recurrenceType, RecurrenceType, "recurrence type") ||
            Defaults.RECURRENCE_TYPE,
        recurrenceInterval:
            recurrenceInterval === null ? Defaults.RECURRENCE_INTERVAL : recurrenceInterval,
        priority: optionalEnum(body.priority, Priority, "priority") || Defaults.PRIORITY,
        assignmentMode,
        visibleToChildren:
            visibleToChildren === null ? Defaults.VISIBLE_TO_CHILDREN : visibleToChildren,
        requiresApproval:
            requiresApproval === null ? Defaults.REQUIRES_APPROVAL : requiresApproval,
        assignedMemberIds
    };
}

function validateUpdateChore(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const patch = {};

    if (body.title !== undefined) {
        patch.title = requiredTrimmedString(body.title, "Title", Limits.TITLE_MAX);
    }

    if (body.description !== undefined) {
        patch.description = optionalTrimmedString(body.description, "Description", Limits.DESCRIPTION_MAX);
    }

    if (body.category !== undefined) {
        patch.category = optionalTrimmedString(body.category, "Category", Limits.CATEGORY_MAX);
    }

    if (body.icon !== undefined) {
        patch.icon = optionalTrimmedString(body.icon, "Icon", Limits.ICON_MAX);
    }

    if (body.color !== undefined) {
        patch.color = optionalTrimmedString(body.color, "Color", Limits.COLOR_MAX);
    }

    if (body.points !== undefined) {
        patch.points = optionalInteger(body.points, "Points", {
            min: 0,
            max: Limits.POINTS_MAX
        });
    }

    if (body.difficulty !== undefined) {
        patch.difficulty = optionalEnum(body.difficulty, Difficulty, "difficulty");
    }

    if (body.estimatedMinutes !== undefined) {
        patch.estimatedMinutes = optionalInteger(body.estimatedMinutes, "Estimated minutes", {
            min: 1,
            max: Limits.ESTIMATED_MINUTES_MAX
        });
    }

    if (body.recurrenceType !== undefined) {
        patch.recurrenceType =
            optionalEnum(body.recurrenceType, RecurrenceType, "recurrence type") ||
            Defaults.RECURRENCE_TYPE;
    }

    if (body.recurrenceInterval !== undefined) {
        const recurrenceInterval = optionalInteger(body.recurrenceInterval, "Recurrence interval", {
            min: 1,
            max: Limits.RECURRENCE_INTERVAL_MAX
        });

        patch.recurrenceInterval =
            recurrenceInterval === null ? Defaults.RECURRENCE_INTERVAL : recurrenceInterval;
    }

    if (body.priority !== undefined) {
        patch.priority = optionalEnum(body.priority, Priority, "priority") || Defaults.PRIORITY;
    }

    if (body.assignmentMode !== undefined) {
        patch.assignmentMode =
            optionalEnum(body.assignmentMode, AssignmentMode, "assignment mode") ||
            Defaults.ASSIGNMENT_MODE;
    }

    if (body.visibleToChildren !== undefined) {
        const value = optionalBoolean(body.visibleToChildren, "visibleToChildren");
        patch.visibleToChildren = value === null ? Defaults.VISIBLE_TO_CHILDREN : value;
    }

    if (body.requiresApproval !== undefined) {
        const value = optionalBoolean(body.requiresApproval, "requiresApproval");
        patch.requiresApproval = value === null ? Defaults.REQUIRES_APPROVAL : value;
    }

    let assignedMemberIds;

    if (body.assignedMemberIds !== undefined) {
        assignedMemberIds = normalizeMemberIds(body.assignedMemberIds);
    }

    if (Object.keys(patch).length === 0 && assignedMemberIds === undefined) {
        throw new ApiError(400, "No valid fields to update.");
    }

    return { patch, assignedMemberIds };
}

function validateListFilters(query) {
    const filters = {
        includeArchived: query?.includeArchived === "true" || query?.includeArchived === true
    };

    return filters;
}

module.exports = {
    validateCreateChore,
    validateUpdateChore,
    validateListFilters,
    validateId
};

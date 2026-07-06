const ApiError = require("../../errors/ApiError");
const {
    isPlainObject,
    validateId,
    requiredTrimmedString,
    optionalTrimmedString,
    optionalEnum,
    optionalInteger,
    optionalBoolean
} = require("../../utils/validate");
const { Roles, Limits } = require("./constants");

const NAME_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 500;

function validateCreateHousehold(body) {
    const name = requiredTrimmedString(body?.name, "Household name", NAME_MAX_LENGTH);
    const description = optionalTrimmedString(
        body?.description,
        "Description",
        DESCRIPTION_MAX_LENGTH
    );

    return { name, description };
}

function validateSelectHousehold(body) {
    return { householdId: validateId(body?.householdId, "household id") };
}

function validateCreateInvite(body) {
    const householdId = validateId(body?.householdId, "household id");
    const role = optionalEnum(body?.role, Roles, "role") || Roles.MEMBER;

    return { householdId, role };
}

function validateJoinHousehold(body) {
    const inviteCode = requiredTrimmedString(body?.inviteCode, "Invite code");

    return { inviteCode: inviteCode.toUpperCase() };
}

function requireValidRole(value) {
    if (typeof value !== "string" || !Object.values(Roles).includes(value)) {
        throw new ApiError(400, "Invalid role.");
    }

    return value;
}

function validateUpdateSettings(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const patch = {};

    for (const field of [
        "pointsEnabled",
        "shopEnabled",
        "choresNeedApproval",
        "childrenCanBuyRewards"
    ]) {
        if (body[field] !== undefined) {
            const value = optionalBoolean(body[field], field);

            if (value === null) {
                throw new ApiError(400, `${field} must be a boolean.`);
            }

            patch[field] = value;
        }
    }

    if (body.weekStartsOn !== undefined) {
        const value = optionalInteger(body.weekStartsOn, "weekStartsOn", { min: 0, max: 6 });

        if (value === null) {
            throw new ApiError(400, "weekStartsOn must be an integer between 0 and 6.");
        }

        patch.weekStartsOn = value;
    }

    if (body.timezone !== undefined) {
        const timezone = requiredTrimmedString(body.timezone, "Timezone", Limits.TIMEZONE_MAX);

        let zones = null;

        try {
            zones = Intl.supportedValuesOf("timeZone");
        } catch {
            zones = null;
        }

        if (zones && !zones.includes(timezone)) {
            throw new ApiError(400, "Invalid timezone.");
        }

        patch.timezone = timezone;
    }

    if (body.defaultCurrency !== undefined) {
        const currency = requiredTrimmedString(
            body.defaultCurrency,
            "Currency",
            Limits.CURRENCY_LENGTH
        ).toUpperCase();

        if (!/^[A-Z]{3}$/.test(currency)) {
            throw new ApiError(400, "Currency must be a three-letter code (e.g. SEK).");
        }

        patch.defaultCurrency = currency;
    }

    if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "No valid fields to update.");
    }

    return patch;
}

function validateUpdateMember(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const patch = {};

    if (body.role !== undefined) {
        patch.role = requireValidRole(body.role);
    }

    if (body.isChildAccount !== undefined) {
        const value = optionalBoolean(body.isChildAccount, "isChildAccount");

        if (value === null) {
            throw new ApiError(400, "isChildAccount must be a boolean.");
        }

        patch.isChildAccount = value;
    }

    if (body.displayName !== undefined) {
        patch.displayName = requiredTrimmedString(
            body.displayName,
            "Display name",
            Limits.DISPLAY_NAME_MAX
        );
    }

    if (body.color !== undefined) {
        patch.color = optionalTrimmedString(body.color, "Color", Limits.COLOR_MAX);
    }

    if (body.avatarUrl !== undefined) {
        patch.avatarUrl = optionalTrimmedString(body.avatarUrl, "Avatar URL", Limits.AVATAR_URL_MAX);
    }

    if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "No valid fields to update.");
    }

    return patch;
}

function validateTransferOwnership(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    return { memberId: validateId(body.memberId, "member id") };
}

module.exports = {
    validateCreateHousehold,
    validateSelectHousehold,
    validateCreateInvite,
    validateJoinHousehold,
    validateUpdateSettings,
    validateUpdateMember,
    validateTransferOwnership,
    validateId
};

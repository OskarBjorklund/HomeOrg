const ApiError = require("../../errors/ApiError");
const { Roles } = require("./constants");

const NAME_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 500;

const VALID_ROLES = Object.values(Roles);

function validateHouseholdId(value) {
    const householdId = Number(value);

    if (!Number.isInteger(householdId) || householdId <= 0) {
        throw new ApiError(400, "A valid household id is required.");
    }

    return householdId;
}

function validateCreateHousehold(body) {
    if (typeof body?.name !== "string" || !body.name.trim()) {
        throw new ApiError(400, "Household name is required.");
    }

    const name = body.name.trim();

    if (name.length > NAME_MAX_LENGTH) {
        throw new ApiError(
            400,
            `Household name must be at most ${NAME_MAX_LENGTH} characters.`
        );
    }

    let description = null;

    if (body.description !== undefined && body.description !== null) {
        if (typeof body.description !== "string") {
            throw new ApiError(400, "Description must be a string.");
        }

        description = body.description.trim() || null;

        if (description && description.length > DESCRIPTION_MAX_LENGTH) {
            throw new ApiError(
                400,
                `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`
            );
        }
    }

    return { name, description };
}

function validateSelectHousehold(body) {
    return { householdId: validateHouseholdId(body?.householdId) };
}

function validateCreateInvite(body) {
    const householdId = validateHouseholdId(body?.householdId);

    let role = Roles.MEMBER;

    if (body?.role !== undefined && body.role !== null) {
        if (typeof body.role !== "string" || !VALID_ROLES.includes(body.role)) {
            throw new ApiError(400, "Invalid role.");
        }

        role = body.role;
    }

    return { householdId, role };
}

function validateJoinHousehold(body) {
    if (typeof body?.inviteCode !== "string" || !body.inviteCode.trim()) {
        throw new ApiError(400, "Invite code is required.");
    }

    return { inviteCode: body.inviteCode.trim().toUpperCase() };
}

module.exports = {
    validateCreateHousehold,
    validateSelectHousehold,
    validateCreateInvite,
    validateJoinHousehold
};

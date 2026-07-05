const {
    validateId,
    requiredTrimmedString,
    optionalTrimmedString,
    optionalEnum
} = require("../../utils/validate");
const { Roles } = require("./constants");

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

module.exports = {
    validateCreateHousehold,
    validateSelectHousehold,
    validateCreateInvite,
    validateJoinHousehold
};

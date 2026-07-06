const service = require("./service");
const response = require("../../utils/response");
const { getSessionIdFromRequest } = require("../../middleware/auth");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function createHousehold(req, res) {
    const household = await service.createHousehold(req.user.id, req.body);

    return response.success(
        res,
        { household },
        "Household created",
        201
    );
}

async function getMyHouseholds(req, res) {
    const households = await service.getMyHouseholds(req.user.id);

    return response.success(
        res,
        { households }
    );
}

async function selectHousehold(req, res) {
    const sessionId = getSessionIdFromRequest(req);

    const { householdId } = await service.selectHousehold(
        sessionId,
        req.user.id,
        req.body
    );

    return response.success(
        res,
        { householdId },
        "Household selected"
    );
}

async function createInvite(req, res) {
    const invite = await service.createInvite(req.user.id, req.body);

    return response.success(
        res,
        { invite },
        "Invite created",
        201
    );
}

async function joinHousehold(req, res) {
    await service.joinHousehold(req.user.id, req.body);

    return response.success(
        res,
        {},
        "Joined household"
    );
}

async function getSettings(req, res) {
    const settings = await service.getSettings(getContext(req));

    return response.success(
        res,
        { settings }
    );
}

async function updateSettings(req, res) {
    const settings = await service.updateSettings(getContext(req), req.body);

    return response.success(
        res,
        { settings },
        "Settings updated"
    );
}

async function getMembers(req, res) {
    const members = await service.getMembers(getContext(req));

    return response.success(
        res,
        { members }
    );
}

async function updateMember(req, res) {
    const member = await service.updateMember(getContext(req), req.params.id, req.body);

    return response.success(
        res,
        { member },
        "Member updated"
    );
}

async function removeMember(req, res) {
    await service.removeMember(getContext(req), req.params.id);

    return response.success(
        res,
        {},
        "Member removed"
    );
}

async function leaveHousehold(req, res) {
    const sessionId = getSessionIdFromRequest(req);

    await service.leaveHousehold(getContext(req), sessionId);

    return response.success(
        res,
        {},
        "Left household"
    );
}

async function transferOwnership(req, res) {
    const newOwner = await service.transferOwnership(getContext(req), req.body);

    return response.success(
        res,
        { newOwner },
        "Ownership transferred"
    );
}

async function getInvites(req, res) {
    const invites = await service.getInvites(getContext(req));

    return response.success(
        res,
        { invites }
    );
}

async function revokeInvite(req, res) {
    await service.revokeInvite(getContext(req), req.params.id);

    return response.success(
        res,
        {},
        "Invite revoked"
    );
}

module.exports = {
    createHousehold,
    getMyHouseholds,
    selectHousehold,
    createInvite,
    joinHousehold,
    getSettings,
    updateSettings,
    getMembers,
    updateMember,
    removeMember,
    leaveHousehold,
    transferOwnership,
    getInvites,
    revokeInvite
};
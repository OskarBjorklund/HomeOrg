const service = require("./service");
const response = require("../../utils/response");
const { getSessionIdFromRequest } = require("../../middleware/auth");

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
    const { householdId } = req.body;

    await service.selectHousehold(
        sessionId,
        req.user.id,
        Number(householdId)
    );

    return response.success(
        res,
        { householdId },
        "Household selected"
    );
}

async function createInvite(req, res) {
    const { householdId, role } = req.body;

    const invite = await service.createInvite(
        req.user.id,
        Number(householdId),
        role
    );

    return response.success(
        res,
        { invite },
        "Invite created",
        201
    );
}

async function joinHousehold(req, res) {
    const { inviteCode } = req.body;

    await service.joinHousehold(req.user.id, inviteCode);

    return response.success(
        res,
        {},
        "Joined household"
    );
}

module.exports = {
    createHousehold,
    getMyHouseholds,
    selectHousehold,
    createInvite,
    joinHousehold
};
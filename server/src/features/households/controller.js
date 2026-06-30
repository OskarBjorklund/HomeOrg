const service = require("./service");
const { getSessionIdFromRequest } = require("../../middleware/auth");

async function createHousehold(req, res) {
    try {
        const household = await service.createHousehold(req.user.id, req.body);

        return res.status(201).json({
            ok: true,
            message: "Household created",
            household
        });
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: error.message
        });
    }
}

async function getMyHouseholds(req, res) {
    try {
        const households = await service.getMyHouseholds(req.user.id);

        return res.json({
            ok: true,
            households
        });
    } catch (error) {
        return res.status(500).json({
            ok: false,
            message: error.message
        });
    }
}

async function selectHousehold(req, res) {
    try {
        const sessionId = getSessionIdFromRequest(req);
        const { householdId } = req.body;

        await service.selectHousehold(sessionId, req.user.id, Number(householdId));

        return res.json({
            ok: true,
            message: "Household selected"
        });
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: error.message
        });
    }
}

async function createInvite(req, res) {
    try {
        const { householdId, role } = req.body;

        const invite = await service.createInvite(
            req.user.id,
            Number(householdId),
            role
        );

        return res.status(201).json({
            ok: true,
            message: "Invite created",
            invite
        });
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: error.message
        });
    }
}

async function joinHousehold(req, res) {
    try {
        const { inviteCode } = req.body;

        await service.joinHousehold(req.user.id, inviteCode);

        return res.json({
            ok: true,
            message: "Joined household"
        });
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: error.message
        });
    }
}

module.exports = {
    createHousehold,
    getMyHouseholds,
    selectHousehold,
    createInvite,
    joinHousehold
};
const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function adjustPoints(req, res) {
    const adjustment = await service.adjustPoints(getContext(req), req.body);

    return response.success(
        res,
        { adjustment },
        "Points adjusted"
    );
}

async function getLedger(req, res) {
    const result = await service.getLedger(getContext(req), req.query);

    return response.success(
        res,
        result
    );
}

async function getSummary(req, res) {
    const summary = await service.getSummary(getContext(req));

    return response.success(
        res,
        { summary }
    );
}

async function getMyPoints(req, res) {
    const points = await service.getMyPoints(getContext(req));

    return response.success(
        res,
        { points }
    );
}

module.exports = {
    adjustPoints,
    getLedger,
    getSummary,
    getMyPoints
};

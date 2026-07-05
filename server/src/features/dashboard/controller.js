const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function getDashboard(req, res) {
    const dashboard = await service.getDashboard(getContext(req), req.query);

    return response.success(
        res,
        { dashboard }
    );
}

module.exports = {
    getDashboard
};

const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function getLeaderboard(req, res) {
    const leaderboard = await service.getLeaderboard(getContext(req), req.query);

    return response.success(
        res,
        { leaderboard }
    );
}

module.exports = {
    getLeaderboard
};

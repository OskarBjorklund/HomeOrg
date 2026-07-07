const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function getAchievements(req, res) {
    const achievements = await service.getAchievements(getContext(req), req.query);

    return response.success(
        res,
        { achievements }
    );
}

module.exports = {
    getAchievements
};

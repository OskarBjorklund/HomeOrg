const { optionalInteger } = require("../../utils/validate");

function validateAchievementsQuery(query) {
    // null betyder "mina egna".
    const memberId = optionalInteger(query?.memberId, "memberId", { min: 1 });

    return { memberId };
}

module.exports = {
    validateAchievementsQuery
};

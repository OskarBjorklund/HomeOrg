const { optionalDate, optionalEnum } = require("../../utils/validate");
const { Period, Defaults } = require("./constants");

function validateLeaderboardQuery(query) {
    const period = optionalEnum(query?.period, Period, "period") || Defaults.PERIOD;

    // Valfri dag i den önskade perioden; null betyder idag.
    const date = optionalDate(query?.date, "date");

    return { period, date };
}

module.exports = {
    validateLeaderboardQuery
};

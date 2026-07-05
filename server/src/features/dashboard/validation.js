const ApiError = require("../../errors/ApiError");
const { Defaults, Limits } = require("./constants");

function validateDashboardQuery(query) {
    let upcomingDays = Defaults.UPCOMING_DAYS;

    if (query?.upcomingDays !== undefined && query.upcomingDays !== "") {
        const number = Number(query.upcomingDays);

        if (!Number.isInteger(number) || number < 1 || number > Limits.UPCOMING_DAYS_MAX) {
            throw new ApiError(
                400,
                `upcomingDays must be an integer between 1 and ${Limits.UPCOMING_DAYS_MAX}.`
            );
        }

        upcomingDays = number;
    }

    return { upcomingDays };
}

module.exports = {
    validateDashboardQuery
};

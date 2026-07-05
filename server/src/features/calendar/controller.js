const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function getCalendar(req, res) {
    const calendar = await service.getCalendar(getContext(req), req.query);

    return response.success(
        res,
        { calendar }
    );
}

async function materializeOccurrence(req, res) {
    const instances = await service.materializeOccurrence(getContext(req), req.body);

    return response.success(
        res,
        { instances },
        "Occurrence materialized",
        201
    );
}

module.exports = {
    getCalendar,
    materializeOccurrence
};

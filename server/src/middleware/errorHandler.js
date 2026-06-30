const response = require("../utils/response");

function errorHandler(err, req, res, next) {
    const status = err.status || 500;

    return response.error(
        res,
        err.message,
        status
    );
}

module.exports = errorHandler;
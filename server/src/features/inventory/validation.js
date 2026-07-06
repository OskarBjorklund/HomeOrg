const { validateId } = require("../../utils/validate");

function validateInventoryQuery(query) {
    const memberId =
        query?.memberId !== undefined && query.memberId !== ""
            ? validateId(query.memberId, "member id")
            : null;

    return { memberId };
}

module.exports = {
    validateInventoryQuery,
    validateId
};

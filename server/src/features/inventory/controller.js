const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function getInventory(req, res) {
    const items = await service.getInventory(getContext(req), req.query);

    return response.success(
        res,
        { items }
    );
}

async function activateItem(req, res) {
    const item = await service.activateItem(getContext(req), req.params.id);

    return response.success(
        res,
        { item },
        "Item activated"
    );
}

module.exports = {
    getInventory,
    activateItem
};

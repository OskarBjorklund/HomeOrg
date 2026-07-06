const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

// ---- Presets ----

async function createPreset(req, res) {
    const preset = await service.createPreset(getContext(req), req.body);

    return response.success(
        res,
        { preset },
        "Preset created",
        201
    );
}

async function getPresets(req, res) {
    const presets = await service.getPresets(getContext(req));

    return response.success(
        res,
        { presets }
    );
}

async function updatePreset(req, res) {
    const preset = await service.updatePreset(getContext(req), req.params.id, req.body);

    return response.success(
        res,
        { preset },
        "Preset updated"
    );
}

async function deletePreset(req, res) {
    await service.deletePreset(getContext(req), req.params.id);

    return response.success(
        res,
        {},
        "Preset deleted"
    );
}

// ---- Listningar ----

async function createItem(req, res) {
    const item = await service.createItem(getContext(req), req.body);

    return response.success(
        res,
        { item },
        "Shop item created",
        201
    );
}

async function getItems(req, res) {
    const items = await service.getItems(getContext(req));

    return response.success(
        res,
        { items }
    );
}

async function updateItem(req, res) {
    const item = await service.updateItem(getContext(req), req.params.id, req.body);

    return response.success(
        res,
        { item },
        "Shop item updated"
    );
}

async function deleteItem(req, res) {
    await service.deleteItem(getContext(req), req.params.id);

    return response.success(
        res,
        {},
        "Shop item delisted"
    );
}

// ---- Köp ----

async function buyItem(req, res) {
    const result = await service.buyItem(getContext(req), req.params.id);

    return response.success(
        res,
        result,
        "Purchase completed",
        201
    );
}

async function getPurchases(req, res) {
    const purchases = await service.getPurchases(getContext(req), req.query);

    return response.success(
        res,
        { purchases }
    );
}

module.exports = {
    createPreset,
    getPresets,
    updatePreset,
    deletePreset,
    createItem,
    getItems,
    updateItem,
    deleteItem,
    buyItem,
    getPurchases
};

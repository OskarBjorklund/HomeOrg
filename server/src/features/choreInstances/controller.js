const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function createInstance(req, res) {
    const instance = await service.createInstance(getContext(req), req.body);

    return response.success(
        res,
        { instance },
        "Chore instance created",
        201
    );
}

async function uncompleteInstance(req, res) {
    const instance = await service.uncompleteInstance(getContext(req), req.params.id);

    return response.success(
        res,
        { instance },
        "Completion undone"
    );
}

async function buyoutInstance(req, res) {
    const instance = await service.buyoutInstance(getContext(req), req.params.id);

    return response.success(
        res,
        { instance },
        "Instance bought out"
    );
}

async function quickCreateInstance(req, res) {
    const instance = await service.quickCreateInstance(getContext(req), req.body);

    return response.success(
        res,
        { instance },
        "Quick task created",
        201
    );
}

async function generateRecurring(req, res) {
    const result = await service.generateRecurring(getContext(req), req.body);

    return response.success(
        res,
        { generated: result },
        "Recurring instances generated"
    );
}

async function getInstances(req, res) {
    const instances = await service.getInstances(getContext(req), req.query);

    return response.success(
        res,
        { instances }
    );
}

async function getInstance(req, res) {
    const instance = await service.getInstance(getContext(req), req.params.id);

    return response.success(
        res,
        { instance }
    );
}

async function claimInstance(req, res) {
    const instance = await service.claimInstance(getContext(req), req.params.id);

    return response.success(
        res,
        { instance },
        "Chore instance claimed"
    );
}

async function unclaimInstance(req, res) {
    const instance = await service.unclaimInstance(getContext(req), req.params.id);

    return response.success(
        res,
        { instance },
        "Chore instance unclaimed"
    );
}

async function completeInstance(req, res) {
    const instance = await service.completeInstance(getContext(req), req.params.id);

    return response.success(
        res,
        { instance },
        "Chore instance completed"
    );
}

async function approveInstance(req, res) {
    const instance = await service.approveInstance(getContext(req), req.params.id);

    return response.success(
        res,
        { instance },
        "Chore instance approved"
    );
}

async function rejectInstance(req, res) {
    const instance = await service.rejectInstance(getContext(req), req.params.id, req.body);

    return response.success(
        res,
        { instance },
        "Chore instance rejected"
    );
}

async function updateInstance(req, res) {
    const instance = await service.updateInstance(getContext(req), req.params.id, req.body);

    return response.success(
        res,
        { instance },
        "Chore instance updated"
    );
}

async function deleteInstance(req, res) {
    await service.deleteInstance(getContext(req), req.params.id);

    return response.success(
        res,
        {},
        "Chore instance deleted"
    );
}

module.exports = {
    createInstance,
    quickCreateInstance,
    uncompleteInstance,
    buyoutInstance,
    generateRecurring,
    getInstances,
    getInstance,
    claimInstance,
    unclaimInstance,
    completeInstance,
    approveInstance,
    rejectInstance,
    updateInstance,
    deleteInstance
};

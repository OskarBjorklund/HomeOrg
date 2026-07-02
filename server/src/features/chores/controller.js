const service = require("./service");
const response = require("../../utils/response");

function getContext(req) {
    return {
        user: req.user,
        member: req.member
    };
}

async function createChore(req, res) {
    const chore = await service.createChore(getContext(req), req.body);

    return response.success(
        res,
        { chore },
        "Chore created",
        201
    );
}

async function getChores(req, res) {
    const chores = await service.getChores(getContext(req), req.query);

    return response.success(
        res,
        { chores }
    );
}

async function getChore(req, res) {
    const chore = await service.getChore(getContext(req), req.params.id);

    return response.success(
        res,
        { chore }
    );
}

async function updateChore(req, res) {
    const chore = await service.updateChore(getContext(req), req.params.id, req.body);

    return response.success(
        res,
        { chore },
        "Chore updated"
    );
}

async function archiveChore(req, res) {
    const isArchived = req.body?.archived !== false;

    const chore = await service.archiveChore(getContext(req), req.params.id, isArchived);

    return response.success(
        res,
        { chore },
        isArchived ? "Chore archived" : "Chore unarchived"
    );
}

async function deleteChore(req, res) {
    await service.deleteChore(getContext(req), req.params.id);

    return response.success(
        res,
        {},
        "Chore deleted"
    );
}

module.exports = {
    createChore,
    getChores,
    getChore,
    updateChore,
    archiveChore,
    deleteChore
};

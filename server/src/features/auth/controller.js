const service = require("./service");
const response = require("../../utils/response");
const {
    setSessionCookie,
    clearSessionCookie,
    getSessionIdFromRequest
} = require("../../middleware/auth");

async function register(req, res) {
    const result = await service.register(req.body);

    setSessionCookie(res, result.session.id);

    return response.success(
        res,
        { user: result.user },
        "User registered",
        201
    );
}

async function login(req, res) {
    const result = await service.login(req.body);

    setSessionCookie(res, result.session.id);

    return response.success(
        res,
        { user: result.user },
        "Logged in"
    );
}

async function logout(req, res) {
    const sessionId = getSessionIdFromRequest(req);

    if (sessionId) {
        await service.logout(sessionId);
    }

    clearSessionCookie(res);

    return response.success(
        res,
        {},
        "Logged out"
    );
}

async function logoutAll(req, res) {
    await service.logoutAll(req.user.id);

    clearSessionCookie(res);

    return response.success(
        res,
        {},
        "Logged out from all sessions"
    );
}

async function logoutOthers(req, res) {
    const sessionId = getSessionIdFromRequest(req);

    await service.logoutOthers(req.user.id, sessionId);

    return response.success(
        res,
        {},
        "Other sessions logged out"
    );
}

async function me(req, res) {
    return response.success(
        res,
        { user: req.user || null },
        "Current user"
    );
}

module.exports = {
    register,
    login,
    logout,
    logoutAll,
    logoutOthers,
    me
};
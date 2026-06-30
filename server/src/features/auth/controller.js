const service = require("./service");
const response = require("../../utils/response");
const {
    setSessionCookie,
    clearSessionCookie,
    getSessionIdFromRequest
} = require("../../middleware/auth");

async function register(req, res) {
    const { username, password, displayName } = req.body;

    const result = await service.register({
        username,
        password,
        displayName
    });

    setSessionCookie(res, result.session.id);

    return response.success(
        res,
        { user: result.user },
        "User registered",
        201
    );
}

async function login(req, res) {
    const { username, password } = req.body;

    const result = await service.login({
        username,
        password
    });

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
        null,
        "Logged out"
    );
}

async function logoutAll(req, res) {
    await service.logoutAll(req.user.id);

    clearSessionCookie(res);

    return response.success(
        res,
        null,
        "Logged out from all sessions"
    );
}

async function logoutOthers(req, res) {
    const sessionId = getSessionIdFromRequest(req);

    await service.logoutOthers(req.user.id, sessionId);

    return response.success(
        res,
        null,
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
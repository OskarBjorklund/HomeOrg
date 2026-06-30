const authService = require("./auth/service");
const {
    setSessionCookie,
    clearSessionCookie,
    getSessionIdFromRequest
} = require("../../middleware/auth");

async function register(req, res) {
    try {
        const { username, password, displayName } = req.body;

        const result = await authService.register({
            username,
            password,
            displayName
        });

        setSessionCookie(res, result.session.id);

        return res.status(201).json({
            ok: true,
            message: "User registered",
            user: result.user
        });
    } catch (error) {
        return res.status(400).json({
            ok: false,
            message: error.message
        });
    }
}

async function login(req, res) {
    try {
        const { username, password } = req.body;

        const result = await authService.login({
            username,
            password
        });

        setSessionCookie(res, result.session.id);

        return res.json({
            ok: true,
            message: "Logged in",
            user: result.user
        });
    } catch (error) {
        return res.status(401).json({
            ok: false,
            message: error.message
        });
    }
}

async function logout(req, res) {
    const sessionId = getSessionIdFromRequest(req);

    if (sessionId) {
        await authService.logout(sessionId);
    }

    clearSessionCookie(res);

    return res.json({
        ok: true,
        message: "Logged out"
    });
}

async function logoutAll(req, res) {
    await authService.logoutAll(req.user.id);
    clearSessionCookie(res);

    return res.json({
        ok: true,
        message: "Logged out from all sessions"
    });
}

async function logoutOthers(req, res) {
    const sessionId = getSessionIdFromRequest(req);

    await authService.logoutOthers(req.user.id, sessionId);

    return res.json({
        ok: true,
        message: "Other sessions logged out"
    });
}

async function me(req, res) {
    return res.json({
        ok: true,
        user: req.user || null
    });
}

module.exports = {
    register,
    login,
    logout,
    logoutAll,
    logoutOthers,
    me
};
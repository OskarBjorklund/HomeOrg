const sessionManager = require("../sessions/sessionManager");
const householdsModel = require("../features/households/model");

const SESSION_COOKIE_NAME = "homeorg_session";

function getSessionIdFromRequest(req) {
    return req.cookies?.[SESSION_COOKIE_NAME] || null;
}

async function attachUser(req, res, next) {
    try {
        const sessionId = getSessionIdFromRequest(req);

        if (!sessionId) {
            req.session = null;
            req.user = null;
            return next();
        }

        const session = await sessionManager.getSession(sessionId);

        if (!session) {
            req.session = null;
            req.user = null;
            return next();
        }

        await sessionManager.updateActivity(sessionId);

        req.session = session;

        req.user = {
            id: session.userId,
            username: session.username,
            displayName: session.displayName,
            householdId: session.householdId
        };

        return next();
    } catch (error) {
        return next(error);
    }
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            ok: false,
            message: "Not authenticated"
        });
    }

    return next();
}

async function requireHousehold(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({
                ok: false,
                message: "Not authenticated"
            });
        }

        if (!req.user.householdId) {
            return res.status(403).json({
                ok: false,
                message: "No active household selected"
            });
        }

        const member = await householdsModel.getMember({
            householdId: req.user.householdId,
            userId: req.user.id
        });

        if (!member) {
            return res.status(403).json({
                ok: false,
                message: "You are not a member of this household."
            });
        }

        req.member = member;

        return next();
    } catch (error) {
        return next(error);
    }
}

function setSessionCookie(res, sessionId) {
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    });
}

function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE_NAME);
}

module.exports = {
    SESSION_COOKIE_NAME,
    attachUser,
    requireAuth,
    requireHousehold,
    setSessionCookie,
    clearSessionCookie,
    getSessionIdFromRequest
};
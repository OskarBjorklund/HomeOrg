const bcrypt = require("bcrypt");
const authModel = require("./model");
const validation = require("./validation");
const ApiError = require("../../errors/ApiError");
const sessionManager = require("../../sessions/sessionManager");

const SALT_ROUNDS = 10;

async function register(body) {
    const { username, password, displayName } = validation.validateRegister(body);

    const existingUser = await authModel.findUserByUsername(username);

    if (existingUser) {
        throw new ApiError(409, "Username already exists.");
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await authModel.createUser({
        username,
        passwordHash,
        displayName
    });

    const session = await sessionManager.createSession(user.id);

    return { user, session };
}

async function login(body) {
    const { username, password } = validation.validateLogin(body);

    const user = await authModel.findUserByUsername(username);

    if (!user) {
        throw new ApiError(401, "Invalid username or password.");
    }

    const passwordIsValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordIsValid) {
        throw new ApiError(401, "Invalid username or password.");
    }

    const session = await sessionManager.createSession(user.id);

    return {
        user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarUrl: user.avatar_url
        },
        session
    };
}

async function logout(sessionId) {
    await sessionManager.destroySession(sessionId);
}

async function logoutAll(userId) {
    await sessionManager.destroyAllUserSessions(userId);
}

async function logoutOthers(userId, currentSessionId) {
    await sessionManager.destroyOtherUserSessions(userId, currentSessionId);
}

module.exports = {
    register,
    login,
    logout,
    logoutAll,
    logoutOthers
};
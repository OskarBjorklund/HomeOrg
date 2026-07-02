const ApiError = require("../../errors/ApiError");

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const PASSWORD_MIN_LENGTH = 8;
const DISPLAY_NAME_MAX_LENGTH = 60;

function requireTrimmedString(value, field) {
    if (typeof value !== "string" || !value.trim()) {
        throw new ApiError(400, `${field} is required.`);
    }

    return value.trim();
}

function validateRegister(body) {
    const username = requireTrimmedString(body?.username, "Username");
    const displayName = requireTrimmedString(body?.displayName, "Display name");

    if (typeof body?.password !== "string" || body.password.length === 0) {
        throw new ApiError(400, "Password is required.");
    }

    const password = body.password;

    if (
        username.length < USERNAME_MIN_LENGTH ||
        username.length > USERNAME_MAX_LENGTH
    ) {
        throw new ApiError(
            400,
            `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`
        );
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        throw new ApiError(
            400,
            `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
        );
    }

    if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
        throw new ApiError(
            400,
            `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`
        );
    }

    return { username, password, displayName };
}

function validateLogin(body) {
    const username = requireTrimmedString(body?.username, "Username");

    if (typeof body?.password !== "string" || body.password.length === 0) {
        throw new ApiError(400, "Password is required.");
    }

    return { username, password: body.password };
}

module.exports = {
    validateRegister,
    validateLogin
};

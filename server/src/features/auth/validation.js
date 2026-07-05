const ApiError = require("../../errors/ApiError");
const { requiredTrimmedString } = require("../../utils/validate");

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const PASSWORD_MIN_LENGTH = 8;
const DISPLAY_NAME_MAX_LENGTH = 60;

function validateRegister(body) {
    const username = requiredTrimmedString(body?.username, "Username");
    const displayName = requiredTrimmedString(
        body?.displayName,
        "Display name",
        DISPLAY_NAME_MAX_LENGTH
    );

    // Lösenord trimmas medvetet inte — mellanslag är giltiga tecken.
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

    return { username, password, displayName };
}

function validateLogin(body) {
    const username = requiredTrimmedString(body?.username, "Username");

    if (typeof body?.password !== "string" || body.password.length === 0) {
        throw new ApiError(400, "Password is required.");
    }

    return { username, password: body.password };
}

module.exports = {
    validateRegister,
    validateLogin
};

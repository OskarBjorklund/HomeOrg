const crypto = require("crypto");
const model = require("./model");
const validation = require("./validation");
const sessionManager = require("../../sessions/sessionManager");
const ApiError = require("../../errors/ApiError");
const { Roles, InviteLength, InviteLifetimeDays } = require("./constants");

function generateInviteCode(length = InviteLength) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < length; i++) {
        code += chars[crypto.randomInt(chars.length)];
    }

    return code;
}

async function createHousehold(userId, body) {
    const { name, description } = validation.validateCreateHousehold(body);

    const household = await model.createHousehold({
        name,
        description,
        createdByUserId: userId
    });

    await model.addMember({
        householdId: household.id,
        userId,
        role: Roles.OWNER
    });

    await model.createDefaultSettings(household.id);

    await model.logActivity({
        householdId: household.id,
        actorUserId: userId,
        action: "HOUSEHOLD_CREATED",
        entityType: "household",
        entityId: household.id,
        message: "Household created"
    });

    return household;
}

async function getMyHouseholds(userId) {
    return model.getHouseholdsForUser(userId);
}

async function selectHousehold(sessionId, userId, body) {
    const { householdId } = validation.validateSelectHousehold(body);

    const member = await model.getMember({
        householdId,
        userId
    });

    if (!member) {
        throw new ApiError(403, "You are not a member of this household.");
    }

    await sessionManager.setHousehold(sessionId, householdId);

    return { householdId };
}

async function createInvite(userId, body) {
    const { householdId, role } = validation.validateCreateInvite(body);

    const member = await model.getMember({
        householdId,
        userId
    });

    if (!member) {
        throw new ApiError(403, "You are not a member of this household.");
    }

    if (![Roles.OWNER, Roles.ADMIN].includes(member.role)) {
        throw new ApiError(403, "Only owners and admins can create invites.");
    }

    const inviteCode = generateInviteCode();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + InviteLifetimeDays);

    const invite = await model.createInvite({
        householdId,
        inviteCode,
        role,
        createdByUserId: userId,
        expiresAt: expiresAt.toISOString()
    });

    await model.logActivity({
        householdId,
        actorUserId: userId,
        action: "INVITE_CREATED",
        entityType: "invite",
        entityId: invite.id,
        message: `Invite ${inviteCode} created`
    });

    return invite;
}

async function joinHousehold(userId, body) {
    const { inviteCode } = validation.validateJoinHousehold(body);

    const invite = await model.getInviteByCode(inviteCode);

    if (!invite) {
        throw new ApiError(404, "Invalid invite code.");
    }

    if (invite.used_at) {
        throw new ApiError(403, "Invite has already been used.");
    }

    if (
        invite.expires_at &&
        new Date(invite.expires_at) < new Date()
    ) {
        throw new ApiError(403, "Invite has expired.");
    }

    const existingMember = await model.getMember({
        householdId: invite.household_id,
        userId
    });

    if (existingMember) {
        throw new ApiError(403, "User is already a member.");
    }

    await model.addMember({
        householdId: invite.household_id,
        userId,
        role: invite.role
    });

    await model.markInviteUsed({
        inviteId: invite.id,
        usedByUserId: userId
    });

    await model.logActivity({
        householdId: invite.household_id,
        actorUserId: userId,
        action: "MEMBER_JOINED",
        entityType: "member",
        entityId: userId,
        message: "A new member joined the household."
    });
}

module.exports = {
    createHousehold,
    getMyHouseholds,
    selectHousehold,
    createInvite,
    joinHousehold
};
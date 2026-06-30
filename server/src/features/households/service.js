const crypto = require("crypto");
const model = require("./model");
const sessionManager = require("../../sessions/sessionManager");
const { Roles, InviteLength, InviteLifetimeDays } = require("./constants");

function generateInviteCode(InviteLength) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < length; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}

async function createHousehold(userId, { name, description }) {
    if (!name || !name.trim()) {
        throw new Error("Household name is required.");
    }

    const household = await model.createHousehold({
        name: name.trim(),
        description: description?.trim() || null,
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

async function selectHousehold(sessionId, userId, householdId) {
    const member = await model.getMember({
        householdId,
        userId
    });

    if (!member) {
        throw new Error("You are not a member of this household.");
    }

    await sessionManager.setHousehold(sessionId, householdId);
}

async function createInvite(userId, householdId, role = Roles.MEMBER) {
    const member = await model.getMember({
        householdId,
        userId
    });

    if (!member) {
        throw new Error("You are not a member of this household.");
    }

    if (![Roles.OWNER, Roles.ADMIN].includes(member.role)) {
        throw new Error("Only owners and admins can create invites.");
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

async function joinHousehold(userId, inviteCode) {
    const invite = await model.getInviteByCode(inviteCode);

    if (!invite) {
        throw new Error("Invalid invite code.");
    }

    if (invite.used_at) {
        throw new Error("Invite has already been used.");
    }

    if (
        invite.expires_at &&
        new Date(invite.expires_at) < new Date()
    ) {
        throw new Error("Invite has expired.");
    }

    const existingMember = await model.getMember({
        householdId: invite.household_id,
        userId
    });

    if (existingMember) {
        throw new Error("User is already a member.");
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
        entityType: Roles.MEMBER,
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
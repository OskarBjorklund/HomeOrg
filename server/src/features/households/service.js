const crypto = require("crypto");
const model = require("./model");
const validation = require("./validation");
const sessionManager = require("../../sessions/sessionManager");
const ApiError = require("../../errors/ApiError");
const { withTransaction } = require("../../database/database");
const {
    Roles,
    RoleRank,
    AdminRoles,
    ActivityActions,
    InviteLength,
    InviteLifetimeDays
} = require("./constants");

function rank(role) {
    return RoleRank[role] ?? 0;
}

function requireAdmin(member) {
    if (!AdminRoles.includes(member.role)) {
        throw new ApiError(403, "You do not have permission to administer this household.");
    }
}

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

    return withTransaction(async () => {
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
    });
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

    if (role === Roles.OWNER) {
        throw new ApiError(400, "Cannot create an invite for the owner role.");
    }

    // Man kan inte bjuda in någon med samma eller högre rang än sin egen.
    if (rank(member.role) <= rank(role)) {
        throw new ApiError(403, "You cannot invite members with a role at or above your own.");
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

    // Inkludera inaktiva medlemskap: den som lämnat och kommer tillbaka
    // återaktiveras i stället för att krocka med UNIQUE-constrainten.
    const existingMember = await model.getMemberAnyStatus({
        householdId: invite.household_id,
        userId
    });

    if (existingMember && existingMember.is_active === 1) {
        throw new ApiError(403, "User is already a member.");
    }

    await withTransaction(async () => {
        if (existingMember) {
            await model.reactivateMember(existingMember.id, invite.role);
        } else {
            await model.addMember({
                householdId: invite.household_id,
                userId,
                role: invite.role
            });
        }

        await model.markInviteUsed({
            inviteId: invite.id,
            usedByUserId: userId
        });

        await model.logActivity({
            householdId: invite.household_id,
            actorUserId: userId,
            action: existingMember
                ? ActivityActions.MEMBER_REJOINED
                : ActivityActions.MEMBER_JOINED,
            entityType: "member",
            entityId: userId,
            message: existingMember
                ? "A member rejoined the household."
                : "A new member joined the household."
        });
    });
}

// ---- Settings ----

async function getSettings(context) {
    const { member } = context;

    return model.getSettings(member.household_id);
}

async function updateSettings(context, body) {
    const { user, member } = context;

    requireAdmin(member);

    const patch = validation.validateUpdateSettings(body);

    const settings = await model.updateSettings(member.household_id, patch);

    await model.logActivity({
        householdId: member.household_id,
        actorUserId: user.id,
        action: ActivityActions.SETTINGS_UPDATED,
        entityType: "settings",
        entityId: member.household_id,
        message: `Settings updated: ${Object.keys(patch).join(", ")}`
    });

    return settings;
}

// ---- Medlemmar ----

async function getMembers(context) {
    const { member } = context;

    return model.getMembersForHousehold(member.household_id);
}

async function getOwnedActiveMember(member, memberId) {
    const target = await model.getMemberById(memberId);

    if (!target || target.householdId !== member.household_id || target.isActive !== 1) {
        throw new ApiError(404, "Member not found.");
    }

    return target;
}

// Egen profil (namn/färg/avatar) får alla ändra. Roll och barnstatus kräver
// admin, och man kan bara hantera medlemmar med lägre rang än sin egen.
async function updateMember(context, memberIdParam, body) {
    const { user, member } = context;

    const id = validation.validateId(memberIdParam, "member id");
    const target = await getOwnedActiveMember(member, id);
    const patch = validation.validateUpdateMember(body);

    const isSelf = target.id === member.id;

    if (patch.role !== undefined) {
        requireAdmin(member);

        if (isSelf) {
            throw new ApiError(400, "You cannot change your own role.");
        }

        if (target.role === Roles.OWNER) {
            throw new ApiError(403, "The owner's role cannot be changed.");
        }

        if (patch.role === Roles.OWNER) {
            throw new ApiError(400, "Use transfer-ownership to assign the owner role.");
        }

        if (rank(member.role) <= rank(target.role) || rank(member.role) <= rank(patch.role)) {
            throw new ApiError(403, "You cannot manage roles at or above your own level.");
        }
    }

    if (patch.isChildAccount !== undefined) {
        requireAdmin(member);

        if (isSelf) {
            throw new ApiError(400, "You cannot change your own child status.");
        }

        if (rank(member.role) <= rank(target.role)) {
            throw new ApiError(403, "You cannot manage members at or above your own level.");
        }
    }

    const touchesProfile =
        patch.displayName !== undefined ||
        patch.color !== undefined ||
        patch.avatarUrl !== undefined;

    if (touchesProfile && !isSelf) {
        requireAdmin(member);

        if (rank(member.role) <= rank(target.role)) {
            throw new ApiError(403, "You cannot manage members at or above your own level.");
        }
    }

    const updated = await model.updateMember(id, patch);

    await model.logActivity({
        householdId: member.household_id,
        actorUserId: user.id,
        action: ActivityActions.MEMBER_UPDATED,
        entityType: "member",
        entityId: id,
        message: `Member updated: ${Object.keys(patch).join(", ")}`
    });

    return updated;
}

async function removeMember(context, memberIdParam) {
    const { user, member } = context;

    requireAdmin(member);

    const id = validation.validateId(memberIdParam, "member id");
    const target = await getOwnedActiveMember(member, id);

    if (target.id === member.id) {
        throw new ApiError(400, "Use leave to exit the household yourself.");
    }

    if (target.role === Roles.OWNER) {
        throw new ApiError(403, "The owner cannot be removed.");
    }

    if (rank(member.role) <= rank(target.role)) {
        throw new ApiError(403, "You cannot remove members at or above your own level.");
    }

    await model.deactivateMember(id);

    await model.logActivity({
        householdId: member.household_id,
        actorUserId: user.id,
        action: ActivityActions.MEMBER_REMOVED,
        entityType: "member",
        entityId: id,
        message: "Member removed from the household."
    });
}

async function leaveHousehold(context, sessionId) {
    const { user, member } = context;

    if (member.role === Roles.OWNER) {
        throw new ApiError(400, "Transfer ownership before leaving the household.");
    }

    await model.deactivateMember(member.id);

    await model.logActivity({
        householdId: member.household_id,
        actorUserId: user.id,
        action: ActivityActions.MEMBER_LEFT,
        entityType: "member",
        entityId: member.id,
        message: "Member left the household."
    });

    await sessionManager.setHousehold(sessionId, null);
}

async function transferOwnership(context, body) {
    const { user, member } = context;

    if (member.role !== Roles.OWNER) {
        throw new ApiError(403, "Only the owner can transfer ownership.");
    }

    const { memberId } = validation.validateTransferOwnership(body);
    const target = await getOwnedActiveMember(member, memberId);

    if (target.id === member.id) {
        throw new ApiError(400, "You are already the owner.");
    }

    await withTransaction(async () => {
        await model.updateMember(target.id, { role: Roles.OWNER });
        await model.updateMember(member.id, { role: Roles.ADMIN });

        await model.logActivity({
            householdId: member.household_id,
            actorUserId: user.id,
            action: ActivityActions.OWNERSHIP_TRANSFERRED,
            entityType: "member",
            entityId: target.id,
            message: "Household ownership transferred."
        });
    });

    return model.getMemberById(target.id);
}

// ---- Invite-administration ----

async function getInvites(context) {
    const { member } = context;

    requireAdmin(member);

    return model.getInvitesForHousehold(member.household_id);
}

async function revokeInvite(context, inviteIdParam) {
    const { user, member } = context;

    requireAdmin(member);

    const id = validation.validateId(inviteIdParam, "invite id");
    const invite = await model.getInviteById(id);

    if (!invite || invite.household_id !== member.household_id) {
        throw new ApiError(404, "Invite not found.");
    }

    if (invite.used_at) {
        throw new ApiError(400, "Used invites cannot be revoked.");
    }

    await model.deleteInvite(id);

    await model.logActivity({
        householdId: member.household_id,
        actorUserId: user.id,
        action: ActivityActions.INVITE_REVOKED,
        entityType: "invite",
        entityId: id,
        message: "Invite revoked."
    });
}

module.exports = {
    createHousehold,
    getMyHouseholds,
    selectHousehold,
    createInvite,
    joinHousehold,
    getSettings,
    updateSettings,
    getMembers,
    updateMember,
    removeMember,
    leaveHousehold,
    transferOwnership,
    getInvites,
    revokeInvite
};
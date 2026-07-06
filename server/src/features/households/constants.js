const Roles = {
    OWNER: "owner",
    ADMIN: "admin",
    ADULT: "adult",
    MEMBER: "member",
    CHILD: "child",
    GUEST: "guest"
};

// Rangordning för rollhantering: man kan bara hantera roller (och medlemmar)
// med lägre rang än sin egen. Ägarskap byts endast via transfer-ownership.
const RoleRank = {
    [Roles.OWNER]: 5,
    [Roles.ADMIN]: 4,
    [Roles.ADULT]: 3,
    [Roles.MEMBER]: 2,
    [Roles.CHILD]: 1,
    [Roles.GUEST]: 0
};

// Roller som får administrera hushållet (settings, medlemmar, invites).
const AdminRoles = [Roles.OWNER, Roles.ADMIN];

const ActivityActions = {
    HOUSEHOLD_CREATED: "HOUSEHOLD_CREATED",
    INVITE_CREATED: "INVITE_CREATED",
    INVITE_REVOKED: "INVITE_REVOKED",
    MEMBER_JOINED: "MEMBER_JOINED",
    MEMBER_REJOINED: "MEMBER_REJOINED",
    MEMBER_LEFT: "MEMBER_LEFT",
    MEMBER_REMOVED: "MEMBER_REMOVED",
    MEMBER_UPDATED: "MEMBER_UPDATED",
    SETTINGS_UPDATED: "SETTINGS_UPDATED",
    OWNERSHIP_TRANSFERRED: "OWNERSHIP_TRANSFERRED"
};

const Limits = {
    DISPLAY_NAME_MAX: 60,
    COLOR_MAX: 30,
    AVATAR_URL_MAX: 300,
    TIMEZONE_MAX: 60,
    CURRENCY_LENGTH: 3
};

module.exports = {
    Roles,
    RoleRank,
    AdminRoles,
    ActivityActions,
    Limits,

    InviteLength: 8,
    InviteLifetimeDays: 7
};

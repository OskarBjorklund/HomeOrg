// Speglar backend: roller som får hantera sysslor, instanser och shop.
export const ManagerRoles = ["owner", "admin", "adult"];

// Roller som får administrera hushållet (settings, medlemmar, invites).
export const AdminRoles = ["owner", "admin"];

// Rangordning — man hanterar bara roller/medlemmar med LÄGRE rang än sin egen.
export const RoleRank = {
    owner: 5,
    admin: 4,
    adult: 3,
    member: 2,
    child: 1,
    guest: 0
};

export const RoleLabels = {
    owner: "Ägare",
    admin: "Admin",
    adult: "Vuxen",
    member: "Medlem",
    child: "Barn",
    guest: "Gäst"
};

// Roller som medlemmen får tilldela andra: lägre rang än sin egen, aldrig
// owner (ägarskap byts endast via transfer-ownership). Samma regel gäller
// för invite-roller.
export function assignableRoles(myRole) {
    const myRank = RoleRank[myRole] ?? 0;

    return Object.keys(RoleRank).filter(
        (role) => role !== "owner" && RoleRank[role] < myRank
    );
}

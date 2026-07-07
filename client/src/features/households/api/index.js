import http from "../../../shared/api/http";

export function getMine() {
    return http.get("/households/mine");
}

export function create({ name, description }) {
    return http.post("/households", { name, description });
}

export function select(householdId) {
    return http.post("/households/select", { householdId });
}

export function join(inviteCode) {
    return http.post("/households/join", { inviteCode });
}

export function createInvite({ householdId, role }) {
    return http.post("/households/invites", { householdId, role });
}

export function getInvites() {
    return http.get("/households/invites");
}

export function revokeInvite(inviteId) {
    return http.delete(`/households/invites/${inviteId}`);
}

export function getMembers() {
    return http.get("/households/members");
}

export function updateMember(memberId, patch) {
    return http.patch(`/households/members/${memberId}`, patch);
}

export function removeMember(memberId) {
    return http.delete(`/households/members/${memberId}`);
}

export function getSettings() {
    return http.get("/households/settings");
}

export function updateSettings(patch) {
    return http.patch("/households/settings", patch);
}

export function leave() {
    return http.post("/households/leave");
}

export function transferOwnership(memberId) {
    return http.post("/households/transfer-ownership", { memberId });
}

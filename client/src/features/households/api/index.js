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

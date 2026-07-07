import http from "../../../shared/api/http";

export function getInstances(params = {}) {
    return http.get("/chore-instances", { params });
}

export function createInstance({ choreId, dueDate, assignedToMemberId }) {
    return http.post("/chore-instances", { choreId, dueDate, assignedToMemberId });
}

export function generateRecurring(daysAhead) {
    return http.post("/chore-instances/generate", daysAhead ? { daysAhead } : {});
}

export function claimInstance(id) {
    return http.post(`/chore-instances/${id}/claim`);
}

export function unclaimInstance(id) {
    return http.post(`/chore-instances/${id}/unclaim`);
}

export function completeInstance(id) {
    return http.post(`/chore-instances/${id}/complete`);
}

export function approveInstance(id) {
    return http.post(`/chore-instances/${id}/approve`);
}

export function rejectInstance(id, reason) {
    return http.post(`/chore-instances/${id}/reject`, { reason });
}

export function deleteInstance(id) {
    return http.delete(`/chore-instances/${id}`);
}

import http from "../../../shared/api/http";

export function getInstances(params = {}) {
    return http.get("/chore-instances", { params });
}

export function createInstance({ choreId, dueDate, assignedToMemberId }) {
    return http.post("/chore-instances", { choreId, dueDate, assignedToMemberId });
}

// Snabb engångsuppgift: skapar dold engångsmall + instans i ett svep.
export function quickCreateInstance(payload) {
    return http.post("/chore-instances/quick", payload);
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

export function uncompleteInstance(id) {
    return http.post(`/chore-instances/${id}/uncomplete`);
}

export function buyoutInstance(id) {
    return http.post(`/chore-instances/${id}/buyout`);
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

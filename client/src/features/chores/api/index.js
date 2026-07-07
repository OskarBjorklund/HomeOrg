import http from "../../../shared/api/http";

export function getChores(includeArchived = false) {
    return http.get("/chores", {
        params: includeArchived ? { includeArchived: "true" } : {}
    });
}

export function getChore(id) {
    return http.get(`/chores/${id}`);
}

export function createChore(payload) {
    return http.post("/chores", payload);
}

export function updateChore(id, payload) {
    return http.patch(`/chores/${id}`, payload);
}

export function setArchived(id, archived) {
    return http.post(`/chores/${id}/archive`, { archived });
}

export function deleteChore(id) {
    return http.delete(`/chores/${id}`);
}

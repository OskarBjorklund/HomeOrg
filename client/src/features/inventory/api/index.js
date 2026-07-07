import http from "../../../shared/api/http";

export function getInventory(params = {}) {
    return http.get("/inventory", { params });
}

export function activateItem(id) {
    return http.post(`/inventory/${id}/activate`);
}

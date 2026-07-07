import http from "../../../shared/api/http";

// ---- Listningar ----

export function getItems() {
    return http.get("/shop/items");
}

export function createItem(payload) {
    return http.post("/shop/items", payload);
}

export function updateItem(id, payload) {
    return http.patch(`/shop/items/${id}`, payload);
}

export function deleteItem(id) {
    return http.delete(`/shop/items/${id}`);
}

export function buyItem(id) {
    return http.post(`/shop/items/${id}/buy`);
}

// ---- Presets ----

export function getPresets() {
    return http.get("/shop/presets");
}

export function createPreset(payload) {
    return http.post("/shop/presets", payload);
}

export function deletePreset(id) {
    return http.delete(`/shop/presets/${id}`);
}

// ---- Köp ----

export function getPurchases(params = {}) {
    return http.get("/shop/purchases", { params });
}

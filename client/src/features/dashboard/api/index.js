import http from "../../../shared/api/http";

export function getDashboard(params = {}) {
    return http.get("/dashboard", { params });
}

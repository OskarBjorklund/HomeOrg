import http from "../../../shared/api/http";

export function register({ username, password, displayName }) {
    return http.post("/auth/register", { username, password, displayName });
}

export function login({ username, password }) {
    return http.post("/auth/login", { username, password });
}

export function logout() {
    return http.post("/auth/logout");
}

export function fetchMe() {
    return http.get("/auth/me");
}

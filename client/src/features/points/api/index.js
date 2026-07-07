import http from "../../../shared/api/http";

export function getMyPoints() {
    return http.get("/points/me");
}

export function getLedger(params = {}) {
    return http.get("/points/ledger", { params });
}

export function getSummary() {
    return http.get("/points/summary");
}

export function adjustPoints({ memberId, amount, note }) {
    return http.post("/points/adjust", { memberId, amount, note });
}

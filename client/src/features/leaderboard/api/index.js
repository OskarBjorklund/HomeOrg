import http from "../../../shared/api/http";

export function getLeaderboard(params = {}) {
    return http.get("/leaderboard", { params });
}

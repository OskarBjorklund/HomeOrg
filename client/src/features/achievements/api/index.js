import http from "../../../shared/api/http";

// memberId utelämnad = mina egna.
export function getAchievements(memberId) {
    return http.get("/achievements", {
        params: memberId ? { memberId } : {}
    });
}

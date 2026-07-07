import http from "../../../shared/api/http";

export function getCalendar({ from, to }) {
    return http.get("/calendar", { params: { from, to } });
}

// Gör en projicerad förekomst av en återkommande syssla till riktiga
// instanser (som sedan hanteras via chore-instances-API:t).
export function materialize({ choreId, dueDate }) {
    return http.post("/calendar/materialize", { choreId, dueDate });
}

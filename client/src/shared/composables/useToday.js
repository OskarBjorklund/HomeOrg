import { ref } from "vue";
import dayjs from "dayjs";

const DATE_FORMAT = "YYYY-MM-DD";

// Dagens datum som en reaktiv ref. En SPA-flik kan stå öppen i dagar
// (surfplattan i hallen) — ett "idag" som räknas ut vid sidladdning blir fel
// efter midnatt. Refen uppdateras därför på intervall och när fliken får
// fokus/blir synlig igen; sidor kan watch:a den och hämta om sina data.
const today = ref(dayjs().format(DATE_FORMAT));

function refreshToday() {
    const current = dayjs().format(DATE_FORMAT);

    if (today.value !== current) {
        today.value = current;
    }
}

let tickerStarted = false;

// En enda global ticker för hela appen — startas av första sidan som
// använder composablen och lever sedan så länge fliken gör det.
function ensureTicker() {
    if (tickerStarted) {
        return;
    }

    tickerStarted = true;

    setInterval(refreshToday, 60 * 1000);
    window.addEventListener("focus", refreshToday);
    document.addEventListener("visibilitychange", refreshToday);
}

export function useToday() {
    ensureTicker();

    return today;
}

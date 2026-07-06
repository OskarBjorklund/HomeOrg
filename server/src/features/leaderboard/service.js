const dayjs = require("dayjs");
const model = require("./model");
const validation = require("./validation");
const { DATE_FORMAT } = require("../../utils/validate");
const { Period } = require("./constants");

// Räknar ut periodens gränser. Veckan respekterar hushållets
// week_starts_on (0 = söndag, 1 = måndag, ... — samma index som dayjs .day()).
async function resolvePeriod(householdId, period, date) {
    if (period === Period.ALL) {
        return { from: null, to: null };
    }

    const base = date ? dayjs(date) : dayjs();

    if (period === Period.MONTH) {
        return {
            from: base.startOf("month").format(DATE_FORMAT),
            to: base.endOf("month").format(DATE_FORMAT)
        };
    }

    const weekStartsOn = await model.getWeekStartsOn(householdId);
    const diff = (base.day() - weekStartsOn + 7) % 7;
    const start = base.subtract(diff, "day");

    return {
        from: start.format(DATE_FORMAT),
        to: start.add(6, "day").format(DATE_FORMAT)
    };
}

// Rankas på intjänade poäng i perioden — inte saldo, så att den som
// spenderar poäng i shoppen inte halkar ner. Lika poäng ger delad placering
// (competition ranking: 1, 1, 3).
function applyRanks(rows) {
    let rank = 0;
    let previousEarned = null;

    return rows.map((row, index) => {
        if (row.earned !== previousEarned) {
            rank = index + 1;
            previousEarned = row.earned;
        }

        return { rank, ...row };
    });
}

async function getLeaderboard(context, query) {
    const { member } = context;

    const { period, date } = validation.validateLeaderboardQuery(query);

    const { from, to } = await resolvePeriod(member.household_id, period, date);

    const rows = await model.getEarnedLeaderboard({
        householdId: member.household_id,
        from,
        to
    });

    return {
        period,
        from,
        to,
        entries: applyRanks(rows)
    };
}

module.exports = {
    getLeaderboard
};

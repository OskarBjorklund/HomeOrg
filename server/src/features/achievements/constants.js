// Mätvärden som achievements kan baseras på. Varje metric beräknas ur
// befintliga källtabeller (chore_instances, points_ledger, shop_purchases) —
// achievements har ingen egen räknar-state som kan glida isär.
const AchievementMetric = {
    CHORES_APPROVED: "chores_approved",
    POINTS_EARNED: "points_earned",
    PURCHASES: "purchases",
    MAX_CHORES_IN_ONE_DAY: "max_chores_in_one_day"
};

module.exports = {
    AchievementMetric
};

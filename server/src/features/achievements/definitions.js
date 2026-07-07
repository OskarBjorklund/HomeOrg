const { AchievementMetric } = require("./constants");

// Katalogen av achievements definieras i kod, inte i databasen:
// den är gemensam för alla hushåll, versioneras med koden och kräver ingen
// seedning. Databasen (member_achievements) lagrar bara upplåsningarna.
//
// key är stabil identifierare (lagras i DB) — ändra ALDRIG en befintlig key.
// Nya achievements kan läggas till fritt; sync-logiken låser upp retroaktivt
// för medlemmar som redan uppfyller tröskeln.
const AchievementDefinitions = [
    {
        key: "first_chore",
        title: "Första sysslan",
        description: "Få din första syssla godkänd.",
        icon: "🌱",
        metric: AchievementMetric.CHORES_APPROVED,
        threshold: 1
    },
    {
        key: "chores_10",
        title: "Flitig",
        description: "Få 10 sysslor godkända.",
        icon: "🧹",
        metric: AchievementMetric.CHORES_APPROVED,
        threshold: 10
    },
    {
        key: "chores_25",
        title: "Arbetsmyra",
        description: "Få 25 sysslor godkända.",
        icon: "🐜",
        metric: AchievementMetric.CHORES_APPROVED,
        threshold: 25
    },
    {
        key: "chores_50",
        title: "Hemmahjälte",
        description: "Få 50 sysslor godkända.",
        icon: "🦸",
        metric: AchievementMetric.CHORES_APPROVED,
        threshold: 50
    },
    {
        key: "chores_100",
        title: "Legendar",
        description: "Få 100 sysslor godkända.",
        icon: "🏆",
        metric: AchievementMetric.CHORES_APPROVED,
        threshold: 100
    },
    {
        key: "points_100",
        title: "Poängsamlare",
        description: "Tjäna 100 poäng totalt.",
        icon: "⭐",
        metric: AchievementMetric.POINTS_EARNED,
        threshold: 100
    },
    {
        key: "points_500",
        title: "Poängjägare",
        description: "Tjäna 500 poäng totalt.",
        icon: "🌟",
        metric: AchievementMetric.POINTS_EARNED,
        threshold: 500
    },
    {
        key: "points_1000",
        title: "Poängmästare",
        description: "Tjäna 1000 poäng totalt.",
        icon: "💫",
        metric: AchievementMetric.POINTS_EARNED,
        threshold: 1000
    },
    {
        key: "first_purchase",
        title: "Första köpet",
        description: "Köp din första belöning i shoppen.",
        icon: "🛍️",
        metric: AchievementMetric.PURCHASES,
        threshold: 1
    },
    {
        key: "purchases_10",
        title: "Stammis",
        description: "Köp 10 belöningar i shoppen.",
        icon: "🛒",
        metric: AchievementMetric.PURCHASES,
        threshold: 10
    },
    {
        key: "busy_day",
        title: "Supersnurr",
        description: "Få 3 sysslor godkända samma dag.",
        icon: "⚡",
        metric: AchievementMetric.MAX_CHORES_IN_ONE_DAY,
        threshold: 3
    }
];

module.exports = {
    AchievementDefinitions
};

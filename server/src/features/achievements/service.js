const model = require("./model");
const validation = require("./validation");
const ApiError = require("../../errors/ApiError");
const { AchievementDefinitions } = require("./definitions");
const { AchievementMetric } = require("./constants");

// Alla mätvärden för en medlem, beräknade ur källtabellerna.
async function computeMetrics(memberId) {
    const [choresApproved, pointsEarned, purchases, maxChoresInOneDay] =
        await Promise.all([
            model.countApprovedChores(memberId),
            model.sumPointsEarned(memberId),
            model.countPurchases(memberId),
            model.maxApprovedChoresInOneDay(memberId)
        ]);

    return {
        [AchievementMetric.CHORES_APPROVED]: choresApproved,
        [AchievementMetric.POINTS_EARNED]: pointsEarned,
        [AchievementMetric.PURCHASES]: purchases,
        [AchievementMetric.MAX_CHORES_IN_ONE_DAY]: maxChoresInOneDay
    };
}

// Detta är det ENDA stället som låser upp achievements. Andra moduler
// (choreInstances, shop, points) anropar den efter händelser som kan påverka
// mätvärdena — samma mönster som points/addPoints.
//
// Idempotent: INSERT OR IGNORE + UNIQUE gör att dubbla anrop är ofarliga.
// Öppnar INGEN egen transaktion — ingår anropet i ett större flöde ansvarar
// anroparen för withTransaction. Returnerar nycklarna som låstes upp nu
// (underlag för framtida notifieringar).
async function syncMemberAchievements({ householdId, memberId }) {
    const [metrics, unlocks] = await Promise.all([
        computeMetrics(memberId),
        model.getUnlocksForMember(memberId)
    ]);

    const unlockedKeys = new Set(unlocks.map((row) => row.achievementKey));
    const newlyUnlocked = [];

    for (const definition of AchievementDefinitions) {
        if (unlockedKeys.has(definition.key)) {
            continue;
        }

        if (metrics[definition.metric] < definition.threshold) {
            continue;
        }

        const inserted = await model.insertUnlock({
            householdId,
            memberId,
            achievementKey: definition.key
        });

        if (inserted) {
            newlyUnlocked.push(definition.key);
        }
    }

    return newlyUnlocked;
}

// Hela katalogen med progress och upplåsningsstatus för en medlem.
// Alla i hushållet får se varandras achievements — samma öppenhet som
// leaderboarden. Sync körs först så att listan är självläkande (retroaktiva
// upplåsningar när nya definitioner tillkommit).
async function getAchievements(context, query) {
    const { member } = context;

    const { memberId } = validation.validateAchievementsQuery(query);

    let targetId = member.id;

    if (memberId !== null && memberId !== member.id) {
        const target = await model.getMemberInHousehold(memberId, member.household_id);

        if (!target) {
            throw new ApiError(404, "Member not found in this household.");
        }

        targetId = target.id;
    }

    await syncMemberAchievements({
        householdId: member.household_id,
        memberId: targetId
    });

    const [metrics, unlocks] = await Promise.all([
        computeMetrics(targetId),
        model.getUnlocksForMember(targetId)
    ]);

    const unlockedAtByKey = new Map(
        unlocks.map((row) => [row.achievementKey, row.unlockedAt])
    );

    const achievements = AchievementDefinitions.map((definition) => {
        const unlockedAt = unlockedAtByKey.get(definition.key) || null;

        return {
            key: definition.key,
            title: definition.title,
            description: definition.description,
            icon: definition.icon,
            metric: definition.metric,
            threshold: definition.threshold,
            progress: Math.min(metrics[definition.metric], definition.threshold),
            unlocked: unlockedAt !== null,
            unlockedAt
        };
    });

    return {
        memberId: targetId,
        unlockedCount: achievements.filter((item) => item.unlocked).length,
        totalCount: achievements.length,
        achievements
    };
}

module.exports = {
    syncMemberAchievements,
    getAchievements
};

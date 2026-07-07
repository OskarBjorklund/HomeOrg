import { InstanceStatus, CompletableStatuses } from "./constants";

// Speglar backend-reglerna för vem som får göra vad med en instans.
// Delas av Att göra-sidan och kalendern — backend upprätthåller dem på riktigt.

export function canClaim(instance) {
    return instance.status === InstanceStatus.OPEN && !instance.assignedToMemberId;
}

export function canUnclaim(instance, { myMemberId, isManager }) {
    return (
        instance.status === InstanceStatus.CLAIMED &&
        (instance.claimedByMemberId === myMemberId || isManager)
    );
}

// Endast tilldelad eller den som tagit uppgiften får slutföra — inga
// undantag, inte ens managers (annars kan de ge sig själva poäng för
// arbete de inte gjort). Speglar backend-regeln.
export function canComplete(instance, { myMemberId }) {
    if (!CompletableStatuses.includes(instance.status)) {
        return false;
    }

    if (instance.assignedToMemberId) {
        return instance.assignedToMemberId === myMemberId;
    }

    return instance.claimedByMemberId === myMemberId;
}

// Ångra en felklickad "klar": utföraren eller manager, så länge instansen
// inte godkänts manuellt av en manager (då är Avvisa rätt väg).
export function canUncomplete(instance, { myMemberId, isManager }) {
    const undoable =
        instance.status === InstanceStatus.COMPLETED ||
        (instance.status === InstanceStatus.APPROVED && !instance.approvedByMemberId);

    if (!undoable) {
        return false;
    }

    return instance.completedByMemberId === myMemberId || isManager;
}

// Friköp: öppen uppgift som är tilldelad mig, mot dubbla poängvärdet.
export function canBuyout(instance, { myMemberId }) {
    return (
        instance.status === InstanceStatus.OPEN &&
        instance.assignedToMemberId === myMemberId &&
        instance.points > 0
    );
}

export function canApprove(instance, { isManager }) {
    return isManager && instance.status === InstanceStatus.COMPLETED;
}

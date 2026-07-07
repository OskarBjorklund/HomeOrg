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

export function canComplete(instance, { myMemberId, isManager }) {
    if (!CompletableStatuses.includes(instance.status)) {
        return false;
    }

    if (isManager) {
        return true;
    }

    if (instance.assignedToMemberId) {
        return instance.assignedToMemberId === myMemberId;
    }

    if (instance.claimedByMemberId) {
        return instance.claimedByMemberId === myMemberId;
    }

    return true;
}

export function canApprove(instance, { isManager }) {
    return isManager && instance.status === InstanceStatus.COMPLETED;
}

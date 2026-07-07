export const InstanceStatus = {
    OPEN: "open",
    CLAIMED: "claimed",
    COMPLETED: "completed",
    APPROVED: "approved",
    REJECTED: "rejected"
};

// Statusar där instansen fortfarande kan markeras som klar.
export const CompletableStatuses = [
    InstanceStatus.OPEN,
    InstanceStatus.CLAIMED,
    InstanceStatus.REJECTED
];

export const StatusLabels = {
    open: "Öppen",
    claimed: "Tagen",
    completed: "Väntar godkännande",
    approved: "Godkänd",
    rejected: "Avvisad"
};

export const StatusFilterOptions = [
    { value: "", label: "Alla" },
    { value: "open", label: "Öppna" },
    { value: "claimed", label: "Tagna" },
    { value: "completed", label: "Väntar godkännande" },
    { value: "approved", label: "Godkända" },
    { value: "rejected", label: "Avvisade" }
];

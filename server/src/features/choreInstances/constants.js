const InstanceStatus = {
    OPEN: "open",
    CLAIMED: "claimed",
    COMPLETED: "completed",
    APPROVED: "approved",
    REJECTED: "rejected"
};

// Statusar därifrån en instans får markeras som klar.
// REJECTED ingår så att en avvisad instans kan göras om.
const CompletableStatuses = [
    InstanceStatus.OPEN,
    InstanceStatus.CLAIMED,
    InstanceStatus.REJECTED
];

const Defaults = {
    GENERATE_DAYS_AHEAD: 7
};

const Limits = {
    GENERATE_DAYS_MAX: 60,
    REJECTION_REASON_MAX: 500,

    // Skyddar genereringsloopen mot skenande iteration
    // (t.ex. korrupt recurrence-data).
    GENERATION_LOOP_CAP: 1000
};

const DATE_FORMAT = "YYYY-MM-DD";

module.exports = {
    InstanceStatus,
    CompletableStatuses,
    Defaults,
    Limits,
    DATE_FORMAT
};

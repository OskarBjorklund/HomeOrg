export const RecurrenceOptions = [
    { value: "none", label: "Engångs" },
    { value: "daily", label: "Daglig" },
    { value: "weekly", label: "Veckovis" },
    { value: "monthly", label: "Månadsvis" }
];

export const PriorityOptions = [
    { value: "low", label: "Låg" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "Hög" },
    { value: "urgent", label: "Akut" }
];

export const DifficultyOptions = [
    { value: "", label: "Ingen" },
    { value: "easy", label: "Lätt" },
    { value: "medium", label: "Medel" },
    { value: "hard", label: "Svår" }
];

export const AssignmentModeOptions = [
    { value: "unassigned", label: "Otilldelad" },
    { value: "anyone", label: "Vem som helst" },
    { value: "specific", label: "Specifika medlemmar" },
    { value: "rotation", label: "Rotation" }
];

export const PoolModes = ["specific", "rotation"];

function toLabelMap(options) {
    return Object.fromEntries(options.map((option) => [option.value, option.label]));
}

export const RecurrenceLabels = toLabelMap(RecurrenceOptions);
export const PriorityLabels = toLabelMap(PriorityOptions);
export const DifficultyLabels = toLabelMap(DifficultyOptions);
export const AssignmentModeLabels = toLabelMap(AssignmentModeOptions);

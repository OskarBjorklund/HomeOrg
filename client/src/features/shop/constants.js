export const UsesModeOptions = [
    { value: "single", label: "Engångs" },
    { value: "multi", label: "Flera användningar" },
    { value: "permanent", label: "Permanent" }
];

// uses_total i backend: 1 = engångs, N = flergångs, null = permanent.
export function usesLabel(usesTotal) {
    if (usesTotal === null) {
        return "Permanent";
    }

    if (usesTotal === 1) {
        return "Engångs";
    }

    return `${usesTotal} användningar`;
}

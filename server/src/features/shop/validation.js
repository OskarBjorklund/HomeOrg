const ApiError = require("../../errors/ApiError");
const {
    isPlainObject,
    validateId,
    requiredTrimmedString,
    optionalTrimmedString,
    optionalInteger,
    optionalBoolean
} = require("../../utils/validate");
const { Limits } = require("./constants");

function normalizeMemberIds(value) {
    if (value === undefined || value === null) {
        return null;
    }

    if (!Array.isArray(value)) {
        throw new ApiError(400, "visibleToMemberIds must be an array.");
    }

    const ids = value.map((raw) => {
        const number = Number(raw);

        if (!Number.isInteger(number) || number <= 0) {
            throw new ApiError(400, "visibleToMemberIds must contain valid member ids.");
        }

        return number;
    });

    return [...new Set(ids)];
}

// uses_total: undefined = inte angivet, null = permanent, N = antal användningar.
function normalizeUsesTotal(value) {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    return optionalInteger(value, "usesTotal", { min: 1, max: Limits.USES_MAX });
}

function validateCreatePreset(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const defaultCost = optionalInteger(body.defaultCost, "Default cost", {
        min: 0,
        max: Limits.COST_MAX
    });

    const usesTotal = normalizeUsesTotal(body.defaultUsesTotal);

    return {
        title: requiredTrimmedString(body.title, "Title", Limits.TITLE_MAX),
        description: optionalTrimmedString(body.description, "Description", Limits.DESCRIPTION_MAX),
        icon: optionalTrimmedString(body.icon, "Icon", Limits.ICON_MAX),
        color: optionalTrimmedString(body.color, "Color", Limits.COLOR_MAX),
        defaultCost: defaultCost === null ? 10 : defaultCost,
        defaultUsesTotal: usesTotal === undefined ? null : usesTotal
    };
}

function validateUpdatePreset(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const patch = {};

    if (body.title !== undefined) {
        patch.title = requiredTrimmedString(body.title, "Title", Limits.TITLE_MAX);
    }

    if (body.description !== undefined) {
        patch.description = optionalTrimmedString(body.description, "Description", Limits.DESCRIPTION_MAX);
    }

    if (body.icon !== undefined) {
        patch.icon = optionalTrimmedString(body.icon, "Icon", Limits.ICON_MAX);
    }

    if (body.color !== undefined) {
        patch.color = optionalTrimmedString(body.color, "Color", Limits.COLOR_MAX);
    }

    if (body.defaultCost !== undefined) {
        const defaultCost = optionalInteger(body.defaultCost, "Default cost", {
            min: 0,
            max: Limits.COST_MAX
        });

        if (defaultCost !== null) {
            patch.defaultCost = defaultCost;
        }
    }

    if (body.defaultUsesTotal !== undefined) {
        patch.defaultUsesTotal = normalizeUsesTotal(body.defaultUsesTotal);
    }

    if (Object.keys(patch).length === 0) {
        throw new ApiError(400, "No valid fields to update.");
    }

    return patch;
}

// Tre lägen: från preset (presetId), ad-hoc + spara som preset (saveAsPreset),
// eller ren engångslistning. Alla fält kan överridas när preset används.
function validateCreateItem(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const presetId =
        body.presetId !== undefined && body.presetId !== null
            ? validateId(body.presetId, "preset id")
            : null;

    const title =
        body.title !== undefined
            ? requiredTrimmedString(body.title, "Title", Limits.TITLE_MAX)
            : null;

    const cost = optionalInteger(body.cost, "Cost", { min: 0, max: Limits.COST_MAX });

    if (!presetId) {
        if (!title) {
            throw new ApiError(400, "Title is required.");
        }

        if (cost === null) {
            throw new ApiError(400, "Cost is required.");
        }
    }

    const saveAsPreset = optionalBoolean(body.saveAsPreset, "saveAsPreset") === true;

    if (presetId && saveAsPreset) {
        throw new ApiError(400, "saveAsPreset cannot be combined with presetId.");
    }

    return {
        presetId,
        title,
        description: optionalTrimmedString(body.description, "Description", Limits.DESCRIPTION_MAX),
        icon: optionalTrimmedString(body.icon, "Icon", Limits.ICON_MAX),
        color: optionalTrimmedString(body.color, "Color", Limits.COLOR_MAX),
        cost,
        usesTotal: normalizeUsesTotal(body.usesTotal),
        disappearsAfterPurchase: optionalBoolean(
            body.disappearsAfterPurchase,
            "disappearsAfterPurchase"
        ),
        visibleToMemberIds: normalizeMemberIds(body.visibleToMemberIds),
        saveAsPreset
    };
}

function validateUpdateItem(body) {
    if (!isPlainObject(body)) {
        throw new ApiError(400, "Request body is required.");
    }

    const patch = {};
    let visibleToMemberIds;

    if (body.title !== undefined) {
        patch.title = requiredTrimmedString(body.title, "Title", Limits.TITLE_MAX);
    }

    if (body.description !== undefined) {
        patch.description = optionalTrimmedString(body.description, "Description", Limits.DESCRIPTION_MAX);
    }

    if (body.icon !== undefined) {
        patch.icon = optionalTrimmedString(body.icon, "Icon", Limits.ICON_MAX);
    }

    if (body.color !== undefined) {
        patch.color = optionalTrimmedString(body.color, "Color", Limits.COLOR_MAX);
    }

    if (body.cost !== undefined) {
        const cost = optionalInteger(body.cost, "Cost", { min: 0, max: Limits.COST_MAX });

        if (cost !== null) {
            patch.cost = cost;
        }
    }

    if (body.usesTotal !== undefined) {
        patch.usesTotal = normalizeUsesTotal(body.usesTotal);
    }

    if (body.disappearsAfterPurchase !== undefined) {
        const value = optionalBoolean(body.disappearsAfterPurchase, "disappearsAfterPurchase");
        patch.disappearsAfterPurchase = value === true;
    }

    if (body.visibleToMemberIds !== undefined) {
        visibleToMemberIds = normalizeMemberIds(body.visibleToMemberIds) || [];
    }

    if (Object.keys(patch).length === 0 && visibleToMemberIds === undefined) {
        throw new ApiError(400, "No valid fields to update.");
    }

    return { patch, visibleToMemberIds };
}

function validatePurchasesQuery(query) {
    const memberId =
        query?.memberId !== undefined && query.memberId !== ""
            ? validateId(query.memberId, "member id")
            : null;

    return { memberId };
}

module.exports = {
    validateCreatePreset,
    validateUpdatePreset,
    validateCreateItem,
    validateUpdateItem,
    validatePurchasesQuery,
    validateId
};

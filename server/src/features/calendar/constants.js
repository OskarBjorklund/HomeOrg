// En kalenderpost är antingen en riktig chore-instans (går att interagera med
// via /api/chore-instances) eller en projektion: en beräknad framtida förekomst
// av en återkommande chore som ännu inte materialiserats till en instans.
const ItemType = {
    INSTANCE: "instance",
    PROJECTION: "projection"
};

const Limits = {
    RANGE_MAX_DAYS: 92,
    MATERIALIZE_MAX_DAYS_AHEAD: 60
};

module.exports = {
    ItemType,
    Limits
};

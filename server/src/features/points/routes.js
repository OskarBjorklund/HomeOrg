const express = require("express");
const controller = require("./controller");
const asyncHandler = require("../../middleware/asyncHandler");
const { requireAuth, requireHousehold } = require("../../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireHousehold);

router.get("/me", asyncHandler(controller.getMyPoints));
router.get("/ledger", asyncHandler(controller.getLedger));
router.get("/summary", asyncHandler(controller.getSummary));
router.post("/adjust", asyncHandler(controller.adjustPoints));

module.exports = router;

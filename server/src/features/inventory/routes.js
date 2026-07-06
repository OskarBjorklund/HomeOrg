const express = require("express");
const controller = require("./controller");
const asyncHandler = require("../../middleware/asyncHandler");
const { requireAuth, requireHousehold } = require("../../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireHousehold);

router.get("/", asyncHandler(controller.getInventory));
router.post("/:id/activate", asyncHandler(controller.activateItem));

module.exports = router;

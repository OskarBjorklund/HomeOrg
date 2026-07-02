const express = require("express");
const controller = require("./controller");
const asyncHandler = require("../../middleware/asyncHandler");
const { requireAuth, requireHousehold } = require("../../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireHousehold);

router.post("/", asyncHandler(controller.createChore));
router.get("/", asyncHandler(controller.getChores));
router.get("/:id", asyncHandler(controller.getChore));
router.patch("/:id", asyncHandler(controller.updateChore));
router.post("/:id/archive", asyncHandler(controller.archiveChore));
router.delete("/:id", asyncHandler(controller.deleteChore));

module.exports = router;

const express = require("express");
const controller = require("./controller");
const asyncHandler = require("../../middleware/asyncHandler");
const { requireAuth, requireHousehold } = require("../../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireHousehold);

router.post("/", asyncHandler(controller.createInstance));
router.post("/generate", asyncHandler(controller.generateRecurring));
router.get("/", asyncHandler(controller.getInstances));
router.get("/:id", asyncHandler(controller.getInstance));
router.patch("/:id", asyncHandler(controller.updateInstance));
router.delete("/:id", asyncHandler(controller.deleteInstance));

router.post("/:id/claim", asyncHandler(controller.claimInstance));
router.post("/:id/unclaim", asyncHandler(controller.unclaimInstance));
router.post("/:id/complete", asyncHandler(controller.completeInstance));
router.post("/:id/approve", asyncHandler(controller.approveInstance));
router.post("/:id/reject", asyncHandler(controller.rejectInstance));

module.exports = router;

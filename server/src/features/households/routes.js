const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");
const asyncHandler = require("../../middleware/asyncHandler");

const router = express.Router();

router.post("/", requireAuth, asyncHandler(controller.createHousehold));
router.get("/mine", requireAuth, asyncHandler(controller.getMyHouseholds));
router.post("/select", requireAuth, asyncHandler(controller.selectHousehold));
router.post("/invites", requireAuth, asyncHandler(controller.createInvite));
router.post("/join", requireAuth, asyncHandler(controller.joinHousehold));

module.exports = router;
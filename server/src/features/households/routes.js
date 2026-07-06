const express = require("express");
const controller = require("./controller");
const { requireAuth, requireHousehold } = require("../../middleware/auth");
const asyncHandler = require("../../middleware/asyncHandler");

const router = express.Router();

// Hushålls-oberoende (tar householdId i body eller listar användarens egna).
router.post("/", requireAuth, asyncHandler(controller.createHousehold));
router.get("/mine", requireAuth, asyncHandler(controller.getMyHouseholds));
router.post("/select", requireAuth, asyncHandler(controller.selectHousehold));
router.post("/invites", requireAuth, asyncHandler(controller.createInvite));
router.post("/join", requireAuth, asyncHandler(controller.joinHousehold));

// Opererar på det aktiva hushållet (via requireHousehold -> req.member).
router.get("/settings", requireAuth, requireHousehold, asyncHandler(controller.getSettings));
router.patch("/settings", requireAuth, requireHousehold, asyncHandler(controller.updateSettings));

router.get("/members", requireAuth, requireHousehold, asyncHandler(controller.getMembers));
router.patch("/members/:id", requireAuth, requireHousehold, asyncHandler(controller.updateMember));
router.delete("/members/:id", requireAuth, requireHousehold, asyncHandler(controller.removeMember));

router.post("/leave", requireAuth, requireHousehold, asyncHandler(controller.leaveHousehold));
router.post("/transfer-ownership", requireAuth, requireHousehold, asyncHandler(controller.transferOwnership));

router.get("/invites", requireAuth, requireHousehold, asyncHandler(controller.getInvites));
router.delete("/invites/:id", requireAuth, requireHousehold, asyncHandler(controller.revokeInvite));

module.exports = router;

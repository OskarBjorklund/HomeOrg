const express = require("express");
const controller = require("./controller");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

router.post("/", requireAuth, controller.createHousehold);

router.get("/mine", requireAuth, controller.getMyHouseholds);

router.post("/select", requireAuth, controller.selectHousehold);

router.post("/invites", requireAuth, controller.createInvite);

router.post("/join", requireAuth, controller.joinHousehold);

module.exports = router;
const express = require("express");
const authController = require("./controller");
const asyncHandler = require("../../middleware/asyncHandler");
const { requireAuth } = require("../../middleware/auth");

const router = express.Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));

router.post("/logout-all", requireAuth, asyncHandler(authController.logoutAll));
router.post("/logout-others", requireAuth, asyncHandler(authController.logoutOthers));

router.get("/me", asyncHandler(authController.me));

module.exports = router;
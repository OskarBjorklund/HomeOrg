const express = require("express");
const controller = require("./controller");
const asyncHandler = require("../../middleware/asyncHandler");
const { requireAuth, requireHousehold } = require("../../middleware/auth");

const router = express.Router();

router.use(requireAuth, requireHousehold);

router.get("/presets", asyncHandler(controller.getPresets));
router.post("/presets", asyncHandler(controller.createPreset));
router.patch("/presets/:id", asyncHandler(controller.updatePreset));
router.delete("/presets/:id", asyncHandler(controller.deletePreset));

router.get("/items", asyncHandler(controller.getItems));
router.post("/items", asyncHandler(controller.createItem));
router.patch("/items/:id", asyncHandler(controller.updateItem));
router.delete("/items/:id", asyncHandler(controller.deleteItem));
router.post("/items/:id/buy", asyncHandler(controller.buyItem));

router.get("/purchases", asyncHandler(controller.getPurchases));

module.exports = router;

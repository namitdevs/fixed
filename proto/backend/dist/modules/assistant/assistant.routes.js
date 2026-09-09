"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../analytics/analytics.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)({ mergeParams: true });
router.use(auth_1.authenticateToken);
router.post('/query', analytics_controller_1.AnalyticsController.queryAssistant);
exports.default = router;

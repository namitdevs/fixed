"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const demo_controller_1 = require("./demo.controller");
const router = (0, express_1.Router)();
// Public endpoint for 1-click evaluation by judges
router.post('/load', demo_controller_1.DemoController.load);
exports.default = router;

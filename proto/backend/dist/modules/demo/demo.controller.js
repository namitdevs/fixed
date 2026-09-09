"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoController = void 0;
const demoSeeder_service_1 = require("./demoSeeder.service");
class DemoController {
    static async load(req, res, next) {
        try {
            const result = await demoSeeder_service_1.DemoSeederService.loadTurnkeyDemoCase();
            res.status(200).json({
                success: true,
                message: 'Turnkey demo investigation case initialized in under 3 seconds',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DemoController = DemoController;

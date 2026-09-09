"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const zod_1 = require("zod");
const auth_service_1 = require("./auth.service");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    role: zod_1.z.enum(['ADMIN', 'INVESTIGATOR', 'ANALYST']).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
class AuthController {
    static async register(req, res, next) {
        try {
            const data = registerSchema.parse(req.body);
            const result = await auth_service_1.AuthService.register(data.name, data.email, data.password, data.role);
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async login(req, res, next) {
        try {
            const data = loginSchema.parse(req.body);
            const result = await auth_service_1.AuthService.login(data.email, data.password);
            res.status(200).json({
                success: true,
                message: 'Authentication successful',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async me(req, res, next) {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const user = await auth_service_1.AuthService.getCurrentUser(req.user.id);
            res.status(200).json({
                success: true,
                data: { user },
            });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;

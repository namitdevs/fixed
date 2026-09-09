"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../utils/prisma");
const config_1 = require("../../config");
class AuthService {
    static async register(name, email, password, role = 'INVESTIGATOR') {
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            const err = new Error('User with this email already exists');
            err.statusCode = 400;
            err.errorCode = 'USER_ALREADY_EXISTS';
            throw err;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const user = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role.toUpperCase(),
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, config_1.config.jwtSecret, { expiresIn: '7d' });
        return { user, token };
    }
    static async login(email, password) {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            err.errorCode = 'INVALID_CREDENTIALS';
            throw err;
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            const err = new Error('Invalid email or password');
            err.statusCode = 401;
            err.errorCode = 'INVALID_CREDENTIALS';
            throw err;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, config_1.config.jwtSecret, { expiresIn: '7d' });
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
            token,
        };
    }
    static async getCurrentUser(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            err.errorCode = 'USER_NOT_FOUND';
            throw err;
        }
        return user;
    }
}
exports.AuthService = AuthService;

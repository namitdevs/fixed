"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({
            success: false,
            errorCode: 'AUTH_REQUIRED',
            message: 'Access denied: Authentication token required',
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(403).json({
            success: false,
            errorCode: 'INVALID_TOKEN',
            message: 'Access denied: Invalid or expired authentication token',
        });
        return;
    }
}
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                errorCode: 'AUTH_REQUIRED',
                message: 'Authentication required',
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                errorCode: 'FORBIDDEN_ROLE',
                message: `Forbidden: Required one of roles [${allowedRoles.join(', ')}]`,
            });
            return;
        }
        next();
    };
}

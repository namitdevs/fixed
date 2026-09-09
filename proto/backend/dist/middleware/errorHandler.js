"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
function errorHandler(err, req, res, next) {
    logger_1.logger.error(`Unhandled Error on ${req.method} ${req.url}:`, err);
    // Zod Validation Error
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            errorCode: 'VALIDATION_ERROR',
            message: 'Input validation failed',
            errors: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }
    // Known custom errors
    const statusCode = err.statusCode || 500;
    const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'An unexpected internal error occurred';
    res.status(statusCode).json({
        success: false,
        errorCode,
        message,
    });
}

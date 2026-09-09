"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
    jwtSecret: process.env.JWT_SECRET || 'sih_2026_criminal_network_super_secret_jwt_key_987654',
    nodeEnv: process.env.NODE_ENV || 'development',
    fileStoragePath: path_1.default.resolve(process.env.FILE_STORAGE_PATH || './uploads'),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
};

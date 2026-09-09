import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'sih_2026_criminal_network_super_secret_jwt_key_987654',
  nodeEnv: process.env.NODE_ENV || 'development',
  fileStoragePath: path.resolve(process.env.FILE_STORAGE_PATH || './uploads'),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};

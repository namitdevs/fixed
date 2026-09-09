import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import caseRoutes from './modules/cases/cases.routes';
import dataSourceRoutes from './modules/datasources/datasources.routes';
import documentRoutes from './modules/documents/documents.routes';
import graphRoutes from './modules/graph/graph.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import assistantRoutes from './modules/assistant/assistant.routes';
import alertRoutes from './modules/alerts/alerts.routes';
import reportRoutes from './modules/reports/reports.routes';
import demoRoutes from './modules/demo/demo.routes';

const app = express();

// Middlewares
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file storage for uploads
app.use('/uploads', express.static(config.fileStoragePath));

// Healthcheck
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: 'AI-Powered Criminal Network Analysis System',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cases', caseRoutes);
app.use('/api/v1/cases/:caseId/datasources', dataSourceRoutes);
app.use('/api/v1/cases/:caseId/documents', documentRoutes);
app.use('/api/v1/cases/:caseId/graph', graphRoutes);
app.use('/api/v1/cases/:caseId/entities', graphRoutes);
app.use('/api/v1/cases/:caseId/analytics', analyticsRoutes);
app.use('/api/v1/cases/:caseId/assistant', assistantRoutes);
app.use('/api/v1/cases/:caseId/alerts', alertRoutes);
app.use('/api/v1/cases/:caseId/reports', reportRoutes);
app.use('/api/v1/demo', demoRoutes);

// Centralized error handling
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`[SERVER] Criminal Network Intelligence Backend running on http://localhost:${config.port}`);
    logger.info(`[SERVER] Environment: ${config.nodeEnv}`);
    logger.info(`[SERVER] SQLite DB Path: ${config.databaseUrl}`);
  });
}

export default app;

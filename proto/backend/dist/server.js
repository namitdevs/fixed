"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
// Route imports
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const cases_routes_1 = __importDefault(require("./modules/cases/cases.routes"));
const datasources_routes_1 = __importDefault(require("./modules/datasources/datasources.routes"));
const documents_routes_1 = __importDefault(require("./modules/documents/documents.routes"));
const graph_routes_1 = __importDefault(require("./modules/graph/graph.routes"));
const analytics_routes_1 = __importDefault(require("./modules/analytics/analytics.routes"));
const assistant_routes_1 = __importDefault(require("./modules/assistant/assistant.routes"));
const alerts_routes_1 = __importDefault(require("./modules/alerts/alerts.routes"));
const reports_routes_1 = __importDefault(require("./modules/reports/reports.routes"));
const demo_routes_1 = __importDefault(require("./modules/demo/demo.routes"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({ origin: '*', credentials: true }));
app.use(express_1.default.json({ limit: '20mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '20mb' }));
// Static file storage for uploads
app.use('/uploads', express_1.default.static(config_1.config.fileStoragePath));
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
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/cases', cases_routes_1.default);
app.use('/api/v1/cases/:caseId/datasources', datasources_routes_1.default);
app.use('/api/v1/cases/:caseId/documents', documents_routes_1.default);
app.use('/api/v1/cases/:caseId/graph', graph_routes_1.default);
app.use('/api/v1/cases/:caseId/entities', graph_routes_1.default);
app.use('/api/v1/cases/:caseId/analytics', analytics_routes_1.default);
app.use('/api/v1/cases/:caseId/assistant', assistant_routes_1.default);
app.use('/api/v1/cases/:caseId/alerts', alerts_routes_1.default);
app.use('/api/v1/cases/:caseId/reports', reports_routes_1.default);
app.use('/api/v1/demo', demo_routes_1.default);
// Centralized error handling
app.use(errorHandler_1.errorHandler);
// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(config_1.config.port, () => {
        logger_1.logger.info(`[SERVER] Criminal Network Intelligence Backend running on http://localhost:${config_1.config.port}`);
        logger_1.logger.info(`[SERVER] Environment: ${config_1.config.nodeEnv}`);
        logger_1.logger.info(`[SERVER] SQLite DB Path: ${config_1.config.databaseUrl}`);
    });
}
exports.default = app;
